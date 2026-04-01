"""
LearnForge — Lab cleanup: background task that reaps expired/orphaned labs.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session_maker
from app.labs.governance import can_start_lab, decrement_active, dequeue_lab
from app.labs.models import Lab, LabStatus, LabTemplate

logger = logging.getLogger("lab_cleanup")

CLEANUP_INTERVAL = 60  # seconds


async def lab_cleanup_loop():
    """Background loop that runs every CLEANUP_INTERVAL seconds."""
    logger.info("Lab cleanup loop started (interval=%ds)", CLEANUP_INTERVAL)

    # Wait a bit for services to be ready
    await asyncio.sleep(10)

    while True:
        try:
            await _cleanup_cycle()
        except Exception as e:
            logger.error("Cleanup cycle error: %s", e)
        await asyncio.sleep(CLEANUP_INTERVAL)


async def _cleanup_cycle():
    """Single cleanup pass: reap expired labs, reconcile counters, trigger dequeue."""
    session_maker = get_session_maker()
    async with session_maker() as db:
        now = datetime.now(timezone.utc)

        # Find expired running labs
        result = await db.execute(
            select(Lab).where(
                Lab.status == LabStatus.running,
                Lab.expires_at != None,  # noqa: E711
                Lab.expires_at < now,
            )
        )
        expired_labs = result.scalars().all()

        for lab in expired_labs:
            logger.info("Reaping expired lab: %s", lab.id)
            from app.labs.manager import stop_lab
            await stop_lab(db, lab)
            await decrement_active()

        # Find stuck provisioning labs using the same runtime profile
        # metadata that provisioning uses.
        from datetime import timedelta
        from app.labs.manager import get_runtime_profile

        result = await db.execute(
            select(Lab, LabTemplate)
            .join(LabTemplate, Lab.template_id == LabTemplate.id)
            .where(Lab.status == LabStatus.provisioning)
        )

        stuck_labs: list[Lab] = []
        for lab, template in result.all():
            profile = get_runtime_profile(template)
            provisioning_cutoff = now - timedelta(seconds=profile.provisioning_timeout_seconds)
            if lab.created_at < provisioning_cutoff:
                logger.warning(
                    "Marking stuck lab as failed: %s (profile=%s timeout=%ss)",
                    lab.id,
                    profile.name,
                    profile.provisioning_timeout_seconds,
                )
                stuck_labs.append(lab)

        for lab in stuck_labs:
            lab.status = LabStatus.failed
            db.add(lab)
            await decrement_active()
        if stuck_labs:
            await db.commit()

        # ── Reconcile active_count with reality ────────────────
        # Count actual running + provisioning labs in DB
        from sqlalchemy import func
        result = await db.execute(
            select(func.count()).where(
                Lab.status.in_([LabStatus.running, LabStatus.provisioning])
            )
        )
        actual_count = result.scalar() or 0
        from app.labs.governance import get_active_count
        redis_count = await get_active_count()
        if redis_count != actual_count:
            logger.warning(
                "Active count drift: Redis=%d, DB=%d — correcting",
                redis_count, actual_count,
            )
            from app.labs.governance import _get_redis
            r = await _get_redis()
            try:
                await r.set("labs:active_count", actual_count)
            finally:
                await r.aclose()

        # Process queue
        await _process_queue(db)


async def _process_queue(db: AsyncSession):
    """Try to dequeue and provision labs if capacity is available."""
    while await can_start_lab():
        queued = await dequeue_lab()
        if queued is None:
            break

        import uuid
        lab_id = uuid.UUID(queued["lab_id"])
        template_id = uuid.UUID(queued["template_id"])

        # Fetch the lab record
        result = await db.execute(select(Lab).where(Lab.id == lab_id))
        lab = result.scalar_one_or_none()
        if lab is None or lab.status != LabStatus.queued:
            continue

        # Fetch template
        result = await db.execute(select(LabTemplate).where(LabTemplate.id == template_id))
        template = result.scalar_one_or_none()
        if template is None:
            lab.status = LabStatus.failed
            db.add(lab)
            await db.commit()
            continue

        # Mark as provisioning and commit before spawning background task
        from app.labs.governance import increment_active
        await increment_active()
        lab.status = LabStatus.provisioning
        db.add(lab)
        await db.commit()

        # Provision in a NEW db session (background task) — never share sessions
        asyncio.create_task(_provision_from_queue(lab_id, template_id))
        logger.info("Dequeued lab %s for provisioning", lab.id)


async def _provision_from_queue(lab_id, template_id):
    """Provision a dequeued lab using its own fresh DB session."""
    import uuid
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

        from app.labs.manager import provision_lab
        await provision_lab(db, lab, template)
