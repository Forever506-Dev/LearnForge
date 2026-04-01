"""
LearnForge — Lab router: manage lab instances.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.websockets import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.labs.governance import (
    can_start_lab,
    decrement_active,
    enqueue_lab,
    get_queue_position,
    increment_active,
    remove_from_queue,
)
from app.labs.manager import provision_lab, stop_lab
from app.labs.models import Lab, LabProtocol, LabStatus, LabTemplate
from app.labs.schemas import (
    LabOut,
    LabStartRequest,
    LabStatusOut,
    LabTemplateListOut,
    LabTemplateOut,
)
from app.models import User

router = APIRouter()
logger = logging.getLogger("labs")


# ── Templates ──────────────────────────────────────────────────

@router.get("/templates", response_model=List[LabTemplateListOut])
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all active lab templates."""
    result = await db.execute(
        select(LabTemplate)
        .where(LabTemplate.is_active == True)  # noqa: E712
        .order_by(LabTemplate.name)
    )
    templates = result.scalars().all()
    return templates


@router.get("/templates/{slug}", response_model=LabTemplateOut)
async def get_template(slug: str, db: AsyncSession = Depends(get_db)):
    """Get full template details including tutorial markdown."""
    result = await db.execute(
        select(LabTemplate).where(LabTemplate.slug == slug, LabTemplate.is_active == True)  # noqa: E712
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Lab template not found")
    return template


# ── Lab lifecycle ──────────────────────────────────────────────

@router.post("/start", response_model=LabOut, status_code=201)
async def start_lab(
    body: LabStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new lab instance. Queues if at capacity."""
    # Check template exists
    result = await db.execute(select(LabTemplate).where(LabTemplate.id == body.template_id))
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Lab template not found")

    # Check if user already has an active lab for this template
    result = await db.execute(
        select(Lab).where(
            Lab.user_id == user.id,
            Lab.template_id == template.id,
            Lab.status.in_([LabStatus.queued, LabStatus.provisioning, LabStatus.running]),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="You already have an active lab for this template")

    # Create lab record
    lab = Lab(user_id=user.id, template_id=template.id)
    db.add(lab)
    await db.flush()

    if await can_start_lab():
        # Start immediately
        await increment_active()
        lab.status = LabStatus.provisioning
        db.add(lab)
        await db.commit()

        logger.info("Lab provisioning started: lab_id=%s user_id=%s template=%s", lab.id, user.id, template.slug)
        # Provision in background
        asyncio.create_task(_provision_in_new_session(lab.id, template.id))
    else:
        # Queue it
        position = await enqueue_lab(lab.id, user.id, template.id)
        lab.status = LabStatus.queued
        lab.queue_position = position
        db.add(lab)
        await db.commit()
        logger.info("Lab queued: lab_id=%s user_id=%s position=%d", lab.id, user.id, position)

    # Re-fetch lab with template eagerly loaded so Pydantic can serialize it
    result = await db.execute(
        select(Lab)
        .where(Lab.id == lab.id)
        .options(selectinload(Lab.template))
    )
    return result.scalar_one()


async def _provision_in_new_session(lab_id: uuid.UUID, template_id: uuid.UUID):
    """Provision a lab using a fresh DB session (background task)."""
    from app.database import get_session_maker
    session_maker = get_session_maker()
    async with session_maker() as db:
        result = await db.execute(select(Lab).where(Lab.id == lab_id))
        lab = result.scalar_one_or_none()
        if lab is None:
            return

        result = await db.execute(select(LabTemplate).where(LabTemplate.id == template_id))
        template = result.scalar_one_or_none()
        if template is None:
            lab.status = LabStatus.failed
            db.add(lab)
            await db.commit()
            return

        await provision_lab(db, lab, template)


@router.get("/mine", response_model=List[LabOut])
async def my_labs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's labs (active + recent stopped)."""
    result = await db.execute(
        select(Lab)
        .where(Lab.user_id == user.id)
        .options(selectinload(Lab.template))
        .order_by(Lab.created_at.desc())
        .limit(20)
    )
    labs = result.scalars().all()

    # Update queue positions for queued labs
    for lab in labs:
        if lab.status == LabStatus.queued:
            pos = await get_queue_position(lab.id)
            lab.queue_position = pos

    return labs


@router.get("/{lab_id}/status", response_model=LabStatusOut)
async def lab_status(
    lab_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current status of a lab."""
    result = await db.execute(
        select(Lab).where(Lab.id == lab_id, Lab.user_id == user.id)
        .options(selectinload(Lab.template))
    )
    lab = result.scalar_one_or_none()
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")

    if lab.status == LabStatus.queued:
        lab.queue_position = await get_queue_position(lab.id)

    # Include provisioning progress from Redis
    from app.labs.governance import get_lab_progress
    progress = await get_lab_progress(lab.id)

    return LabStatusOut(
        id=lab.id,
        status=lab.status,
        web_url=lab.web_url,
        ssh_host=lab.ssh_host,
        ssh_port=lab.ssh_port,
        ssh_user=lab.ssh_user,
        ssh_password=lab.ssh_password,
        queue_position=lab.queue_position,
        expires_at=lab.expires_at,
        progress_pct=progress["pct"] if progress else None,
        progress_stage=progress["stage"] if progress else None,
    )


@router.post("/{lab_id}/stop", response_model=LabStatusOut)
async def stop_lab_endpoint(
    lab_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stop a running or queued lab."""
    result = await db.execute(select(Lab).where(Lab.id == lab_id, Lab.user_id == user.id))
    lab = result.scalar_one_or_none()
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")

    if lab.status == LabStatus.queued:
        await remove_from_queue(lab.id)
        lab.status = LabStatus.stopped
        db.add(lab)
        await db.commit()
        logger.info("Queued lab cancelled: lab_id=%s user_id=%s", lab.id, user.id)
        return lab

    if lab.status not in (LabStatus.running, LabStatus.provisioning):
        raise HTTPException(status_code=400, detail="Lab is not running")

    await stop_lab(db, lab)
    await decrement_active()
    logger.info("Lab stopped: lab_id=%s user_id=%s", lab.id, user.id)

    # Trigger dequeue
    from app.labs.cleanup import _process_queue
    asyncio.create_task(_process_queue_wrapper())

    return lab


async def _process_queue_wrapper():
    """Process queue with fresh DB session, after a short delay so counters settle."""
    await asyncio.sleep(0.5)
    from app.database import get_session_maker
    session_maker = get_session_maker()
    async with session_maker() as db:
        from app.labs.cleanup import _process_queue
        try:
            await _process_queue(db)
        except Exception as e:
            import logging
            logging.getLogger("lab_router").error("Queue processing error: %s", e)


# ── SSE real-time status ───────────────────────────────────────

@router.get("/{lab_id}/events")
async def lab_events(
    lab_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    SSE endpoint for real-time lab status updates.
    Accepts token as a query parameter because EventSource cannot send headers.
    """
    from app.auth import decode_token, is_token_blacklisted

    token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    user_id, jti = decode_token(token, expected_type="access")
    if user_id is None or jti is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if await is_token_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token revoked")

    result = await db.execute(select(Lab).where(Lab.id == lab_id, Lab.user_id == user_id))
    lab = result.scalar_one_or_none()
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")

    async def event_generator():
        from app.database import get_session_maker
        from app.labs.governance import get_lab_progress, clear_lab_progress
        session_maker = get_session_maker()
        last_status = None
        last_progress_pct = None

        while True:
            async with session_maker() as fresh_db:
                result = await fresh_db.execute(select(Lab).where(Lab.id == lab_id))
                fresh_lab = result.scalar_one_or_none()
                if fresh_lab is None:
                    yield {"event": "error", "data": "Lab not found"}
                    break

                current_status = fresh_lab.status.value

                # Check provisioning progress from Redis
                progress = await get_lab_progress(lab_id)
                current_pct = progress["pct"] if progress else None

                if current_status != last_status or current_pct != last_progress_pct:
                    import json
                    data = {
                        "status": current_status,
                            "web_url": fresh_lab.web_url,
                        "queue_position": fresh_lab.queue_position,
                        "expires_at": fresh_lab.expires_at.isoformat() if fresh_lab.expires_at else None,
                        "progress_pct": progress["pct"] if progress else None,
                        "progress_stage": progress["stage"] if progress else None,
                    }
                    yield {"event": "status", "data": json.dumps(data)}
                    last_status = current_status
                    last_progress_pct = current_pct

                # Stop streaming if lab is in a terminal state
                if current_status in ("running", "stopping", "stopped", "failed"):
                    await clear_lab_progress(lab_id)
                    # Brief sleep so nginx can flush the final event before we close
                    await asyncio.sleep(0.5)
                    break

            await asyncio.sleep(1)  # Poll every 1s for smooth progress updates

    return EventSourceResponse(event_generator())


# ── WebSocket proxy for noVNC (binary VNC tunnel) ─────────────

logger = logging.getLogger("lab_router")


async def _ws_authenticate(ws: WebSocket, db: AsyncSession):
    """
    Authenticate a WebSocket proxy request.
    Tries in order:
      1. lab_proxy cookie  (set by the HTTP proxy on the initial vnc.html load)
      2. ?token= query param (fallback / direct testing)
    The browser sends cookies on WebSocket upgrade requests, so the cookie
    approach is transparent — the noVNC JS client doesn't need any special
    auth logic.
    """
    from app.auth import decode_token, is_token_blacklisted

    # 1. Try the lab_proxy cookie first
    token = ws.cookies.get("lab_proxy")
    # 2. Fallback to query param
    if not token:
        token = ws.query_params.get("token")
    if not token:
        await ws.close(code=1008, reason="Missing credentials")
        return None, None

    user_id, jti = decode_token(token, expected_type="access")
    if user_id is None or jti is None:
        await ws.close(code=1008, reason="Invalid token")
        return None, None
    if await is_token_blacklisted(jti):
        await ws.close(code=1008, reason="Token revoked")
        return None, None

    # Parse lab_id from the path (passed by FastAPI route param)
    lab_id_str = ws.path_params.get("lab_id")
    if not lab_id_str:
        await ws.close(code=1008, reason="Missing lab_id")
        return None, None

    lab_id = uuid.UUID(str(lab_id_str))
    result = await db.execute(
        select(Lab).where(Lab.id == lab_id, Lab.user_id == user_id)
    )
    lab = result.scalar_one_or_none()
    if not lab or lab.status != LabStatus.running:
        await ws.close(code=1008, reason="Lab not running")
        return None, None

    return user_id, lab


def _get_novnc_proxy_port(template: LabTemplate) -> int:
    return template.internal_port or 6080


@router.websocket("/{lab_id}/proxy/websockify")
async def proxy_novnc_websocket(
    lab_id: uuid.UUID,
    ws: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket reverse-proxy: browser noVNC client ↔ container websockify.
    Tunnels raw binary VNC frames so the desktop renders in the browser.
    """
    import websockets

    user_id, lab = await _ws_authenticate(ws, db)
    if user_id is None:
        return  # socket already closed by _ws_authenticate

    result = await db.execute(select(LabTemplate).where(LabTemplate.id == lab.template_id))
    template = result.scalar_one_or_none()
    if template is None or template.protocol != LabProtocol.novnc:
        await ws.close(code=1008, reason="Lab is not a browser VM")
        return

    target = f"ws://{lab.container_ip}:{_get_novnc_proxy_port(template)}/websockify"

    # Mirror whatever subprotocols the browser requested (noVNC sends
    # [] when wsProtocols option is empty).  Per RFC 6455 §4.2.2 the
    # server MUST NOT respond with a subprotocol the client did not
    # offer, or the browser will fail the connection.
    _raw_protos = ws.headers.get("sec-websocket-protocol", "")
    _client_protos = [p.strip() for p in _raw_protos.split(",") if p.strip()]
    _accept_proto = _client_protos[0] if _client_protos else None
    await ws.accept(subprotocol=_accept_proto)

    try:
        logger.warning("WS-PROXY [%s] connecting upstream → %s  (client protos=%s)", lab_id, target, _client_protos or "none")
        async with websockets.connect(
            target,
            subprotocols=_client_protos or None,
            max_size=2**22,          # 4 MB per frame
            open_timeout=10,
            close_timeout=5,
        ) as upstream:
            logger.warning("WS-PROXY [%s] upstream connected, subprotocol=%s", lab_id, upstream.subprotocol)

            # Bidirectional tunnel: browser ↔ websockify
            async def browser_to_vnc():
                """Forward frames from browser → websockify."""
                try:
                    while True:
                        data = await ws.receive()
                        msg_type = data.get("type", "")
                        if msg_type == "websocket.disconnect":
                            logger.warning("WS-PROXY [%s] browser sent disconnect (code=%s)", lab_id, data.get("code"))
                            break
                        if "bytes" in data and data["bytes"]:
                            await upstream.send(data["bytes"])
                        elif "text" in data and data["text"]:
                            await upstream.send(data["text"])
                except WebSocketDisconnect:
                    logger.warning("WS-PROXY [%s] browser disconnected (clean)", lab_id)
                except Exception as exc:
                    logger.warning("WS-PROXY [%s] browser_to_vnc error: %s: %s", lab_id, type(exc).__name__, exc)

            async def vnc_to_browser():
                """Forward frames from websockify → browser."""
                try:
                    async for msg in upstream:
                        if isinstance(msg, bytes):
                            await ws.send_bytes(msg)
                        else:
                            await ws.send_text(msg)
                    logger.info("WS-PROXY [%s] upstream iteration ended normally", lab_id)
                except WebSocketDisconnect:
                    logger.info("WS-PROXY [%s] vnc_to_browser: browser gone", lab_id)
                except Exception as exc:
                    logger.warning("WS-PROXY [%s] vnc_to_browser error: %s: %s", lab_id, type(exc).__name__, exc)

            # Run both directions concurrently; when either side
            # disconnects the other task is cancelled automatically.
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(browser_to_vnc()),
                    asyncio.create_task(vnc_to_browser()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            logger.info("WS-PROXY [%s] tunnel closed", lab_id)

    except Exception as e:
        logger.error("WebSocket proxy error for lab %s: %s: %s", lab_id, type(e).__name__, e)
    finally:
        try:
            await ws.close()
        except Exception:
            pass


# ── Web lab proxy (Option B) ──────────────────────────────────

_http_client: httpx.AsyncClient | None = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    return _http_client


async def _resolve_proxy_user(
    lab_id: uuid.UUID, request: Request, db: AsyncSession
) -> uuid.UUID | None:
    """
    Authenticate the proxy request.  Tries, in order:
      1. Authorization: Bearer header  (normal API calls)
      2. lab_proxy cookie               (iframe sub-resources)
      3. ?token= query parameter         (initial iframe load)
    Returns the authenticated user_id or None.
    """
    from app.auth import decode_token, is_token_blacklisted

    # 1. Bearer header
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        raw = auth[7:]
        uid, jti = decode_token(raw)
        if uid and jti and not await is_token_blacklisted(jti):
            return uid

    # 2. Cookie (set on first authenticated proxy hit)
    cookie_token = request.cookies.get("lab_proxy")
    if cookie_token:
        uid, jti = decode_token(cookie_token)
        if uid and jti and not await is_token_blacklisted(jti):
            return uid

    # 3. Query parameter (iframe src URL)
    qp_token = request.query_params.get("token")
    if qp_token:
        uid, jti = decode_token(qp_token)
        if uid and jti and not await is_token_blacklisted(jti):
            return uid

    return None


def _novnc_custom_html(lab_id: uuid.UUID, token: str) -> str:
    """
    Minimal noVNC page served instead of the container's vnc.html.

    Key differences from the standard noVNC vnc.html:
    - Imports RFB directly (no app/ui.js) so rfb is in *our* module scope
    - Adds a postMessage clipboard bridge: parent → VM and VM → parent
    - Auto-connects with resize/scale on load

    All asset imports (./core/rfb.js, ./core/util/*, ./core/decoders/*)
    resolve to /api/labs/{lab_id}/proxy/core/… because the browser treats
    this page as being at /api/labs/{lab_id}/proxy/vnc.html.
    The proxy below fetches those assets from the template's configured
    noVNC/QEMU HTTP port.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VM Desktop</title>
  <link rel="stylesheet" href="app/styles/base.css"/>
  <link rel="stylesheet" href="app/styles/input.css"/>
  <style>
    html, body {{ margin: 0; padding: 0; background: #1a1a1a; overflow: hidden; }}
    #screen {{ width: 100vw; height: 100vh; }}
    /* Force the noVNC canvas to fill the viewport on VMs whose VNC server
       does not honour DesktopSize resize requests (e.g. QEMU VGA=std).
       For VMs that do resize (virtio/QXL), the canvas already matches the
       viewport so this has no visible effect on them. */
    #screen canvas {{ display: block !important; width: 100% !important; height: 100% !important; }}
    #status-overlay {{
      position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.65); color: #e2e8f0; font: 13px/1.4 monospace;
      padding: 6px 14px; border-radius: 6px; pointer-events: none;
      transition: opacity 0.4s; z-index: 100;
    }}
    #status-overlay.hidden {{ opacity: 0; }}
  </style>
</head>
<body>
  <div id="screen"></div>
  <div id="status-overlay">Connecting…</div>

  <script type="module">
    import RFB from './core/rfb.js';

    const params   = new URLSearchParams(location.search);
    const wsPath   = params.get('path') || 'websockify';
    const wsToken  = params.get('token') || '';
    const rawPort  = location.port;
    const port     = rawPort ? ':' + rawPort : '';
    const scheme   = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl    = scheme + '://' + location.hostname + port + '/' + wsPath
                     + (wsToken ? '?token=' + encodeURIComponent(wsToken) : '');

    const overlay  = document.getElementById('status-overlay');
    let hideTimer;

    function showStatus(msg, autoHide) {{
      overlay.textContent = msg;
      overlay.classList.remove('hidden');
      clearTimeout(hideTimer);
      if (autoHide) hideTimer = setTimeout(() => overlay.classList.add('hidden'), 2500);
    }}

    let rfb;
    let reconnects = 0;
    const MAX_RECONNECTS = 3;

    function connect() {{
      rfb = new RFB(document.getElementById('screen'), wsUrl, {{ shared: true }});
      rfb.scaleViewport = true;
      rfb.resizeSession  = true;

      rfb.addEventListener('connect', () => {{
        reconnects = 0;
        showStatus('Connected', true);
        window.parent.postMessage({{ type: 'vnc-connected' }}, '*');
      }});

      rfb.addEventListener('disconnect', (e) => {{
        if (e.detail.clean) {{
          showStatus('Disconnected');
          return;
        }}
        if (reconnects < MAX_RECONNECTS) {{
          reconnects++;
          showStatus('Reconnecting… (' + reconnects + '/' + MAX_RECONNECTS + ')');
          setTimeout(connect, 1500 * reconnects);
        }} else {{
          showStatus('Connection lost — reload to retry');
        }}
      }});

      // VM clipboard → parent React component
      rfb.addEventListener('clipboard', (e) => {{
        window.parent.postMessage(
          {{ type: 'clipboard-vm', text: e.detail.text }}, '*'
        );
      }});
    }}

    // Parent React component → VM clipboard + auto-paste at cursor
    window.addEventListener('message', (e) => {{
      if (e.data && e.data.type === 'clipboard-paste' && rfb) {{
        // 1. Put the text into the VNC clipboard buffer
        rfb.clipboardPasteFrom(e.data.text);
        // 2. Simulate Ctrl+V so it pastes at the cursor without user interaction
        rfb.sendKey(0xFFE3, 'ControlLeft', true);   // Ctrl ↓
        rfb.sendKey(0x0076, 'KeyV',        true);   // V ↓
        rfb.sendKey(0x0076, 'KeyV',        false);  // V ↑
        rfb.sendKey(0xFFE3, 'ControlLeft', false);  // Ctrl ↑
        showStatus('Pasted ✓', true);
      }}
    }});

    connect();
  </script>
</body>
</html>"""


@router.api_route(
    "/{lab_id}/proxy/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
)
async def proxy_web_lab(
    lab_id: uuid.UUID,
    path: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Reverse-proxy requests to a web-protocol lab container (or SSH labs with HTTP service)."""

    # ── noVNC static asset bypass ────────────────────────────────
    # The custom vnc.html page loads noVNC JS/CSS via relative imports
    # (e.g. ./core/rfb.js, ./app/styles/base.css).  These are library
    # files from the container's noVNC installation — not user data.
    # In iframe contexts browsers may block the lab_proxy cookie
    # (SameSite restrictions), causing 401 on every sub-resource.
    # We allow unauthenticated GET access to these safe static paths
    # so the VNC client can actually initialize.
    _NOVNC_STATIC_PREFIXES = ("core/", "app/styles/", "app/images/", "vendor/")
    _NOVNC_STATIC_EXTS = (".js", ".css", ".png", ".svg", ".map", ".json", ".woff", ".woff2", ".ttf")
    is_novnc_static = (
        request.method == "GET"
        and any(path.startswith(p) for p in _NOVNC_STATIC_PREFIXES)
        and any(path.endswith(e) for e in _NOVNC_STATIC_EXTS)
    )

    if is_novnc_static:
        # Lightweight auth-free path: just verify the lab exists and is running
        result = await db.execute(select(Lab).where(Lab.id == lab_id))
        lab = result.scalar_one_or_none()
        if lab is None or lab.status != LabStatus.running:
            raise HTTPException(status_code=404, detail="Lab not found")
        result = await db.execute(select(LabTemplate).where(LabTemplate.id == lab.template_id))
        template = result.scalar_one_or_none()
        if template is None or template.protocol != LabProtocol.novnc:
            raise HTTPException(status_code=403, detail="Forbidden")
        proxy_port = _get_novnc_proxy_port(template)
    else:
        user_id = await _resolve_proxy_user(lab_id, request, db)
        if user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = await db.execute(select(Lab).where(Lab.id == lab_id, Lab.user_id == user_id))
        lab = result.scalar_one_or_none()
        if lab is None:
            raise HTTPException(status_code=404, detail="Lab not found")
        if lab.status != LabStatus.running:
            raise HTTPException(status_code=400, detail="Lab is not running")

        result = await db.execute(select(LabTemplate).where(LabTemplate.id == lab.template_id))
        template = result.scalar_one_or_none()
        # Allow web protocol OR novnc protocol OR any lab that has a web_url (e.g. ShellShock SSH+Apache)
        if template is None or (
            template.protocol.value not in ("web", "novnc") and not lab.web_url
        ):
            raise HTTPException(status_code=400, detail="Not a web lab")

        # Browser VMs proxy through the template's configured HTTP console port
        if template.protocol.value == "novnc":
            proxy_port = _get_novnc_proxy_port(template)
        # For dual-service labs (e.g. ShellShock: SSH+Apache), proxy always goes to port 80
        elif template.protocol.value != "web":
            proxy_port = 80
        else:
            proxy_port = template.internal_port

    # ── Custom noVNC page with clipboard bridge ──────────────────
    if not is_novnc_static and template.protocol.value == "novnc" and path == "vnc.html":
        token = request.query_params.get("token", "")
        custom_html = _novnc_custom_html(lab_id, token)
        response = Response(content=custom_html, media_type="text/html")
        # Always refresh the cookie so a re-login gets a fresh token
        if token:
            response.set_cookie(
                key="lab_proxy",
                value=token,
                httponly=True,
                samesite="lax",
                path=f"/api/labs/{lab_id}/proxy/",
                max_age=3600,
            )
        return response
    # ─────────────────────────────────────────────────────────────

    target_url = f"http://{lab.container_ip}:{proxy_port}/{path}"
    # Forward query string but strip our auth token from it
    qs_parts = [
        f"{k}={v}"
        for k, v in request.query_params.multi_items()
        if k != "token"
    ]
    if qs_parts:
        target_url += "?" + "&".join(qs_parts)

    body = await request.body()
    headers = dict(request.headers)
    # Strip headers that shouldn't be forwarded to the lab container
    for drop_hdr in ("host", "authorization", "cookie", "accept-encoding"):
        headers.pop(drop_hdr, None)
    # Force identity encoding so httpx receives uncompressed content.
    # Without this, gzip-compressed responses get forwarded as raw bytes
    # and the browser can't decode them (Issue: Juice Shop garbled output).
    headers["accept-encoding"] = "identity"

    client = _get_http_client()
    resp = await client.request(
        method=request.method,
        url=target_url,
        headers=headers,
        content=body,
    )

    # Strip hop-by-hop / framing headers — Starlette sets its own
    HOP_BY_HOP = {"transfer-encoding", "content-length", "content-encoding", "connection", "keep-alive"}
    resp_headers = {k: v for k, v in resp.headers.items() if k.lower() not in HOP_BY_HOP}

    # Rewrite absolute URLs in HTML so links like /cgi-bin/foo stay within proxy
    content = resp.content
    content_type = resp.headers.get("content-type", "")
    if "text/html" in content_type:
        import re
        proxy_base = f"/api/labs/{lab_id}/proxy"
        html = content.decode("utf-8", errors="replace")
        # Rewrite href="/...", src="/...", action="/..." to go through the proxy
        html = re.sub(
            r'''((?:href|src|action)\s*=\s*)(["'])/(?!/)''',
            rf'\1\2{proxy_base}/',
            html,
        )
        # Inject <base> tag + fetch/XHR intercept so Angular/SPA apps that make
        # absolute-path API calls (e.g. Juice Shop's /rest/...) route through proxy.
        intercept_js = f"""<script>
(function(){{
  var B='{proxy_base}';
  var _f=window.fetch;
  window.fetch=function(u,o){{
    if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;
    return _f.call(this,u,o);
  }};
  var _o=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){{
    if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;
    return _o.apply(this,arguments);
  }};
}})();
</script>"""
        # Insert base tag + interceptor right after <head> (or prepend to <html>)
        if "<head>" in html:
            html = html.replace("<head>", f'<head><base href="{proxy_base}/">{intercept_js}', 1)
        elif "<HEAD>" in html:
            html = html.replace("<HEAD>", f'<HEAD><base href="{proxy_base}/">{intercept_js}', 1)
        else:
            html = intercept_js + html
        content = html.encode("utf-8")

    # Strip security/framing headers that the upstream app may set —
    # they would block the lab iframe (nginx's own headers take precedence).
    STRIP_HEADERS = HOP_BY_HOP | {"x-frame-options", "content-security-policy", "x-content-type-options"}
    resp_headers = {k: v for k, v in resp_headers.items() if k.lower() not in STRIP_HEADERS}

    response = Response(
        content=content,
        status_code=resp.status_code,
        headers=resp_headers,
    )

    # Set session cookie so iframe sub-resources (CSS/JS/images) authenticate
    # automatically without needing the token query param.
    if not request.cookies.get("lab_proxy"):
        token = request.query_params.get("token") or request.headers.get("authorization", "")[7:]
        if token:
            response.set_cookie(
                key="lab_proxy",
                value=token,
                httponly=True,
                samesite="strict",
                path=f"/api/labs/{lab_id}/proxy/",
                max_age=3600,
            )

    return response
