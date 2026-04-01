"""
LearnForge — Lab Manager: Docker SDK-based container lifecycle management.
Handles lab provisioning, teardown, and network wiring.
SSH labs are now accessed via xterm.js + ssh-proxy WebSocket service.
"""

from __future__ import annotations

import asyncio
import http.client
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Final

import docker
from sqlalchemy.ext.asyncio import AsyncSession

import redis as sync_redis

from app.config import get_settings
from app.labs.models import Lab, LabProtocol, LabStatus, LabTemplate

logger = logging.getLogger("lab_manager")

# ── Docker client (lazy singleton) ─────────────────────────────

_docker_client = None


def get_docker_client() -> docker.DockerClient:
    global _docker_client
    if _docker_client is None:
        _docker_client = docker.from_env()
    return _docker_client


# ── Lab lifecycle ──────────────────────────────────────────────

LABS_NET_PREFIX = "learnforge-lab-"
NOVNC_VNC_PORT = 5901
QEMU_NOVNC_HTTP_PORT = 8006
DOCKER_CPU_PERIOD = 100_000
KVM_DEVICE_PATH = "/dev/kvm"
TUN_DEVICE_PATH = "/dev/net/tun"
GENERIC_NOVNC_HTTP_PATHS: Final[tuple[str, ...]] = ("/", "/index.html", "/vnc.html")


@dataclass(frozen=True, slots=True)
class DeviceRequest:
    host_path: str
    container_path: str | None = None
    permissions: str = "rwm"
    required: bool = True

    def to_docker_mapping(self) -> str:
        target_path = self.container_path or self.host_path
        return f"{self.host_path}:{target_path}:{self.permissions}"


@dataclass(frozen=True, slots=True)
class RuntimeProfile:
    name: str
    mem_limit: str
    shm_size: str
    cpu_limit: float
    stop_timeout_seconds: int
    readiness_timeout_seconds: int
    provisioning_timeout_seconds: int
    readiness_http_paths: tuple[str, ...] = ()
    readiness_companion_ports: tuple[int, ...] = ()
    cap_add: tuple[str, ...] = ()
    devices: tuple[DeviceRequest, ...] = ()
    # When True, a named Docker volume is created and mounted at /lab-storage.
    # Required for QEMU-based VMs: dockurr/windows and qemux/qemu refuse to
    # write disk images to OverlayFS (the default container filesystem).
    requires_storage_volume: bool = False

    @property
    def cpu_quota(self) -> int:
        return max(int(self.cpu_limit * DOCKER_CPU_PERIOD), 1)


@dataclass(frozen=True, slots=True)
class RuntimeProfileOverride:
    profile: RuntimeProfile
    slug: str | None = None
    image: str | None = None
    image_prefix: str | None = None
    internal_port: int | None = None
    protocol: LabProtocol | None = None
    runtime_env: tuple[tuple[str, str], ...] = ()

    def matches(self, template: LabTemplate) -> bool:
        slug = template.slug.lower()
        image = (template.docker_image or "").lower()

        if self.slug is not None and slug != self.slug:
            return False
        if self.image is not None and image != self.image:
            return False
        if self.image_prefix is not None and not image.startswith(self.image_prefix):
            return False
        if self.internal_port is not None and template.internal_port != self.internal_port:
            return False
        if self.protocol is not None and template.protocol != self.protocol:
            return False

        return True


DEFAULT_RUNTIME_PROFILE: Final[RuntimeProfile] = RuntimeProfile(
    name="standard-container",
    mem_limit="512m",
    shm_size="128m",
    cpu_limit=0.5,
    stop_timeout_seconds=5,
    readiness_timeout_seconds=30,
    provisioning_timeout_seconds=5 * 60,
)

# Juice Shop is a Node.js + Angular app that takes 60-90 s to initialise on
# first boot (SQLite setup + module loading).  Give it more time and memory.
JUICE_SHOP_RUNTIME_PROFILE: Final[RuntimeProfile] = RuntimeProfile(
    name="juice-shop",
    mem_limit="1g",
    shm_size="128m",
    cpu_limit=1.0,
    stop_timeout_seconds=10,
    readiness_timeout_seconds=120,
    provisioning_timeout_seconds=5 * 60,
)

CONTAINERIZED_NOVNC_RUNTIME_PROFILE: Final[RuntimeProfile] = RuntimeProfile(
    name="container-novnc",
    mem_limit="1g",
    shm_size="256m",
    cpu_limit=0.5,
    stop_timeout_seconds=10,
    readiness_timeout_seconds=60,
    provisioning_timeout_seconds=15 * 60,
    readiness_http_paths=GENERIC_NOVNC_HTTP_PATHS,
    readiness_companion_ports=(NOVNC_VNC_PORT,),
)

KVM_QEMU_RUNTIME_PROFILE: Final[RuntimeProfile] = RuntimeProfile(
    name="kvm-qemu-vm",
    mem_limit="4g",
    shm_size="512m",
    cpu_limit=2.0,
    stop_timeout_seconds=120,
    readiness_timeout_seconds=20 * 60,
    provisioning_timeout_seconds=30 * 60,
    readiness_http_paths=GENERIC_NOVNC_HTTP_PATHS,
    cap_add=("NET_ADMIN",),
    devices=(
        DeviceRequest(KVM_DEVICE_PATH),
        DeviceRequest(TUN_DEVICE_PATH),
    ),
    requires_storage_volume=True,
)

WINDOWS_KVM_RUNTIME_PROFILE: Final[RuntimeProfile] = RuntimeProfile(
    name="kvm-qemu-windows",
    mem_limit="18g",
    shm_size="512m",
    cpu_limit=8.0,
    stop_timeout_seconds=120,
    readiness_timeout_seconds=20 * 60,
    provisioning_timeout_seconds=30 * 60,
    readiness_http_paths=GENERIC_NOVNC_HTTP_PATHS,
    cap_add=("NET_ADMIN",),
    devices=(
        DeviceRequest(KVM_DEVICE_PATH),
        DeviceRequest(TUN_DEVICE_PATH),
    ),
    requires_storage_volume=True,
)

PARROT_VM_RUNTIME_ENV: Final[tuple[tuple[str, str], ...]] = (
    ("VM_NET_HOST", "parrot-security-7-1-vm"),
    ("BOOT_MODE", "uefi"),
)

WINDOWS_RUNTIME_ENV: Final[tuple[tuple[str, str], ...]] = (
    ("RAM_SIZE", "16G"),
    ("CPU_CORES", "8"),
    ("DNS_SERVER", "8.8.8.8"),
    ("ADAPTER", "e1000"),
)

RUNTIME_PROFILE_OVERRIDES: Final[tuple[RuntimeProfileOverride, ...]] = (
    RuntimeProfileOverride(
        profile=JUICE_SHOP_RUNTIME_PROFILE,
        image="bkimminich/juice-shop",
    ),
    RuntimeProfileOverride(
        profile=WINDOWS_KVM_RUNTIME_PROFILE,
        slug="windows11",
        runtime_env=WINDOWS_RUNTIME_ENV,
    ),
    RuntimeProfileOverride(
        profile=WINDOWS_KVM_RUNTIME_PROFILE,
        image="learnforge/windows11:latest",
        runtime_env=WINDOWS_RUNTIME_ENV,
    ),
    RuntimeProfileOverride(
        profile=KVM_QEMU_RUNTIME_PROFILE,
        slug="parrot-os",
        protocol=LabProtocol.novnc,
        internal_port=QEMU_NOVNC_HTTP_PORT,
        runtime_env=PARROT_VM_RUNTIME_ENV,
    ),
    RuntimeProfileOverride(
        profile=KVM_QEMU_RUNTIME_PROFILE,
        image_prefix="learnforge/parrot-os-vm",
        protocol=LabProtocol.novnc,
    ),
    RuntimeProfileOverride(
        profile=KVM_QEMU_RUNTIME_PROFILE,
        image_prefix="learnforge/parrot-vm",
        protocol=LabProtocol.novnc,
    ),
)


def get_runtime_profile(template: LabTemplate | None) -> RuntimeProfile:
    if template is None:
        return DEFAULT_RUNTIME_PROFILE

    for override in RUNTIME_PROFILE_OVERRIDES:
        if override.matches(template):
            return override.profile

    if template.protocol == LabProtocol.novnc:
        return CONTAINERIZED_NOVNC_RUNTIME_PROFILE

    return DEFAULT_RUNTIME_PROFILE


def get_runtime_environment(template: LabTemplate | None) -> dict[str, str]:
    if template is None:
        return {}

    for override in RUNTIME_PROFILE_OVERRIDES:
        if override.matches(template) and override.runtime_env:
            return dict(override.runtime_env)

    return {}


def _cleanup_failed_container(container) -> None:
    if container is None:
        return
    try:
        container.remove(force=True)
    except docker.errors.NotFound:
        pass
    except Exception as e:
        logger.warning("Error cleaning up failed container: %s", e)


def _lab_storage_volume_name(lab_id_hex: str) -> str:
    return f"lab-storage-{lab_id_hex[:12]}"


def _remove_storage_volume(client: docker.DockerClient, lab_id_hex: str) -> None:
    name = _lab_storage_volume_name(lab_id_hex)
    try:
        client.volumes.get(name).remove(force=True)
        logger.debug("Removed storage volume %s", name)
    except docker.errors.NotFound:
        pass
    except Exception as e:
        logger.warning("Error removing storage volume %s: %s", name, e)


def _remove_network(network) -> None:
    if network is None:
        return
    try:
        network.reload()
        for cid in (network.attrs.get("Containers") or {}):
            try:
                network.disconnect(cid, force=True)
            except Exception:
                pass
        network.remove()
    except docker.errors.NotFound:
        pass
    except Exception as e:
        logger.warning("Error removing network: %s", e)


def _container_log_excerpt(container, tail: int = 40) -> str:
    try:
        output = container.logs(tail=tail)
    except Exception:
        return ""

    if isinstance(output, bytes):
        return output.decode("utf-8", errors="replace").strip()
    return str(output).strip()


def _connect_container_to_network(
    client: docker.DockerClient,
    network,
    candidates: list[str],
    label: str = "container",
) -> None:
    """Connect a platform container to a lab network by trying candidate names."""
    for candidate in candidates:
        try:
            container = client.containers.get(candidate)
            nets = container.attrs.get("NetworkSettings", {}).get("Networks", {})
            if network.name in nets:
                logger.debug("%s already on network %s", label, network.name)
                return
            network.connect(container)
            logger.info("Connected %s (%s) to lab network %s", label, candidate, network.name)
            return
        except docker.errors.NotFound:
            continue
        except Exception as e:
            logger.warning("Failed to connect %s (%s) to lab network: %s", label, candidate, e)
            continue
    logger.warning("Could not find %s to connect to lab network", label)


def _connect_api_to_network(client: docker.DockerClient, network) -> None:
    """Connect the API container to a lab network so the reverse-proxy can reach it."""
    import socket as _socket

    hostname = _socket.gethostname()
    _connect_container_to_network(
        client, network,
        candidates=[hostname, "quiz-platform-api-1", "quiz-platform_api_1"],
        label="API",
    )


def _connect_ssh_proxy_to_network(client: docker.DockerClient, network) -> None:
    """Connect the SSH proxy to a lab network so it can reach SSH containers."""
    _connect_container_to_network(
        client, network,
        candidates=["quiz-platform-ssh-proxy-1", "quiz-platform_ssh-proxy_1", "ssh-proxy"],
        label="ssh-proxy",
    )


def _required_device_summary(profile: RuntimeProfile) -> str:
    return ", ".join(device.host_path for device in profile.devices if device.required)


def _validate_runtime_prerequisites(
    client: docker.DockerClient,
    template: LabTemplate,
    profile: RuntimeProfile,
) -> None:
    if not profile.devices:
        return

    try:
        docker_info = client.info()
    except Exception as e:
        logger.debug("Could not read Docker daemon info for runtime preflight: %s", e)
        return

    daemon_os = str(docker_info.get("OSType") or "").lower()
    if daemon_os and daemon_os != "linux":
        raise RuntimeError(
            f"Lab template '{template.slug}' requires Linux host device(s) "
            f"{_required_device_summary(profile)}, but Docker daemon reports OSType={daemon_os!r}"
        )


def _build_container_run_kwargs(
    lab: Lab,
    template: LabTemplate,
    network_name: str,
    profile: RuntimeProfile,
) -> dict[str, object]:
    run_kwargs: dict[str, object] = {
        "detach": True,
        "name": f"lab-{lab.id.hex[:12]}",
        "network": network_name,
        "labels": {
            "learnforge": "lab",
            "lab_id": str(lab.id),
            "user_id": str(lab.user_id),
        },
        "mem_limit": profile.mem_limit,
        "cpu_period": DOCKER_CPU_PERIOD,
        "cpu_quota": profile.cpu_quota,
        "restart_policy": {"Name": "unless-stopped"},
        "shm_size": profile.shm_size,
    }

    if profile.cap_add:
        run_kwargs["cap_add"] = list(profile.cap_add)
    if profile.devices:
        run_kwargs["devices"] = [device.to_docker_mapping() for device in profile.devices]
    if profile.requires_storage_volume:
        volume_name = _lab_storage_volume_name(lab.id.hex)
        run_kwargs["volumes"] = {volume_name: {"bind": "/lab-storage", "mode": "rw"}}
    runtime_env = get_runtime_environment(template)
    if runtime_env:
        run_kwargs["environment"] = runtime_env

    return run_kwargs


def _start_lab_container(
    client: docker.DockerClient,
    lab: Lab,
    template: LabTemplate,
    network_name: str,
    profile: RuntimeProfile,
):
    try:
        return client.containers.run(
            template.docker_image,
            **_build_container_run_kwargs(lab, template, network_name, profile),
        )
    except docker.errors.APIError as e:
        if profile.devices:
            required_devices = _required_device_summary(profile)
            raise RuntimeError(
                f"Lab template '{template.slug}' requires host device(s) {required_devices} "
                f"and Docker capabilities {', '.join(profile.cap_add) or 'none'}, "
                f"but Docker could not apply that runtime profile: {e}"
            ) from e
        raise


def _wait_for_container_ip(container, network_name: str, timeout: int = 15) -> str:
    import time

    start = time.time()
    last_status = "created"
    while time.time() - start < timeout:
        container.reload()
        last_status = container.status
        networks = container.attrs.get("NetworkSettings", {}).get("Networks", {})
        container_ip = networks.get(network_name, {}).get("IPAddress")
        if container_ip:
            return container_ip
        if last_status in {"exited", "dead"}:
            break
        time.sleep(0.5)

    raise RuntimeError(
        f"Lab container {container.id[:12]} did not receive an IP on network {network_name} "
        f"(status={last_status})"
    )


async def provision_lab(db: AsyncSession, lab: Lab, template: LabTemplate) -> None:
    """
    Provision a lab container in a background thread (Docker SDK is sync).
    Updates the Lab record with container details.
    """
    lab.status = LabStatus.provisioning
    db.add(lab)
    await db.commit()

    try:
        result = await asyncio.to_thread(_provision_sync, lab, template)
        lab.container_id = result["container_id"]
        lab.container_ip = result["container_ip"]
        lab.network_id = result["network_id"]
        lab.status = LabStatus.running

        settings = get_settings()
        lab.started_at = datetime.now(timezone.utc)
        lab.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.LAB_TTL_MINUTES)

        if template.protocol == LabProtocol.web:
            lab.web_url = f"/api/labs/{lab.id}/proxy/"
        elif template.protocol == LabProtocol.novnc:
            lab.web_url = f"/api/labs/{lab.id}/proxy/"
        else:
            if "shellshock" in (template.docker_image or "").lower():
                lab.web_url = f"/api/labs/{lab.id}/proxy/"

        if template.protocol == LabProtocol.ssh:
            creds = template.default_credentials or {}
            lab.ssh_host = result["container_ip"]
            lab.ssh_port = template.internal_port
            lab.ssh_user = creds.get("username", "root")
            lab.ssh_password = creds.get("password", "toor")

        db.add(lab)
        await db.commit()
        logger.info("Lab %s provisioned: container=%s ip=%s", lab.id, lab.container_id[:12], lab.container_ip)

        from app.labs.governance import clear_lab_progress

        await clear_lab_progress(lab.id)

    except Exception as e:
        logger.error("Failed to provision lab %s: %s", lab.id, e)
        lab.status = LabStatus.failed
        db.add(lab)
        await db.commit()

        from app.labs.governance import clear_lab_progress

        await clear_lab_progress(lab.id)


def _provision_sync(lab: Lab, template: LabTemplate) -> dict:
    """Synchronous Docker operations — runs in a thread."""
    settings = get_settings()
    profile = get_runtime_profile(template)

    progress_conn = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)
    progress_key = f"labs:progress:{lab.id}"
    network = None
    container = None

    def report(pct: int, stage: str):
        try:
            progress_conn.set(progress_key, json.dumps({"pct": pct, "stage": stage}), ex=600)
        except Exception:
            pass

    try:
        report(5, "Initializing environment…")
        client = get_docker_client()
        network_name = f"{LABS_NET_PREFIX}{lab.id.hex[:12]}"

        report(15, "Creating isolated network…")
        network = client.networks.create(
            network_name,
            driver="bridge",
            internal=False,
            labels={"learnforge": "lab", "lab_id": str(lab.id)},
        )

        report(25, "Configuring network connectivity…")
        _connect_api_to_network(client, network)
        if template.protocol == LabProtocol.ssh:
            _connect_ssh_proxy_to_network(client, network)

        report(40, "Checking image availability…")
        try:
            client.images.get(template.docker_image)
            report(50, "Image ready")
        except docker.errors.ImageNotFound:
            report(45, "Downloading lab image (first-time setup)…")
            logger.info("Pulling image: %s", template.docker_image)
            client.images.pull(template.docker_image)
            report(55, "Image downloaded")

        report(60, "Starting container…")
        _validate_runtime_prerequisites(client, template, profile)
        if profile.requires_storage_volume:
            client.volumes.create(
                name=_lab_storage_volume_name(lab.id.hex),
                labels={"learnforge": "lab-storage", "lab_id": str(lab.id)},
            )
        container = _start_lab_container(client, lab, template, network_name, profile)

        report(75, "Container started — configuring…")
        container_ip = _wait_for_container_ip(container, network_name)

        report(85, "Waiting for service to be ready…")
        _wait_for_port(
            container,
            container_ip,
            template.internal_port,
            timeout=profile.readiness_timeout_seconds,
            http_paths=profile.readiness_http_paths,
            companion_ports=profile.readiness_companion_ports,
        )

        report(95, "Finalizing lab environment…")
        return {
            "container_id": container.id,
            "container_ip": container_ip,
            "network_id": network.id,
        }
    except Exception:
        _cleanup_failed_container(container)
        _remove_network(network)
        if profile.requires_storage_volume:
            _remove_storage_volume(client, lab.id.hex)
        raise
    finally:
        try:
            progress_conn.close()
        except Exception:
            pass


def _check_container_port(host: str, port: int) -> tuple[bool, str]:
    """TCP reachability check from the API container — no tooling required inside the lab container."""
    import socket as _socket
    try:
        with _socket.create_connection((host, port), timeout=2):
            return True, "open"
    except (OSError, ConnectionRefusedError) as e:
        return False, str(e)


def _check_novnc_http(host: str, port: int, paths: tuple[str, ...]) -> tuple[bool, str]:
    details: list[str] = []

    for path in paths:
        connection = http.client.HTTPConnection(host, port, timeout=2)
        try:
            connection.request(
                "GET",
                path,
                headers={
                    "Host": "127.0.0.1",
                    "User-Agent": "learnforge-readiness/1.0",
                },
            )
            response = connection.getresponse()
            response.read(128)
            status_detail = f"{path} -> HTTP {response.status}"
            if 200 <= response.status < 500 and response.status != 404:
                return True, status_detail
            details.append(status_detail)
        except (OSError, http.client.HTTPException) as e:
            details.append(f"{path} -> {e}")
        finally:
            connection.close()

    return False, "; ".join(details) if details else "no HTTP paths configured"


def _wait_for_port(
    container,
    host: str,
    port: int,
    timeout: int = 30,
    *,
    http_paths: tuple[str, ...] = (),
    companion_ports: tuple[int, ...] = (),
):
    """Wait for a service to become available on the lab network."""
    import time

    start = time.time()
    stable_checks = 0
    last_status = "created"
    last_port_detail = "not checked"
    last_http_detail = "not checked"
    last_companion_details: list[str] = []

    while time.time() - start < timeout:
        try:
            container.reload()
            last_status = container.status
        except Exception:
            last_status = "unknown"

        if last_status in {"exited", "dead"}:
            break

        is_ready, last_port_detail = _check_container_port(host, port)
        companion_ready = True
        last_companion_details = []
        if is_ready and companion_ports:
            for companion_port in companion_ports:
                companion_ready, companion_detail = _check_container_port(host, companion_port)
                last_companion_details.append(f"{companion_port}={companion_detail}")
                if not companion_ready:
                    break

        if is_ready and companion_ready and http_paths:
            is_ready, last_http_detail = _check_novnc_http(host, port, http_paths)
        elif not http_paths:
            last_http_detail = "not required"

        if is_ready and companion_ready:
            stable_checks += 1
            if stable_checks >= 2:
                return
        else:
            stable_checks = 0

        time.sleep(1)

    details = [
        f"host={host}",
        f"status={last_status}",
        f"port_check={last_port_detail}",
    ]
    if companion_ports:
        details.append(f"companion_ports={', '.join(last_companion_details) or 'not checked'}")
    if http_paths:
        details.append(f"http_paths={', '.join(http_paths)}")
        details.append(f"http_check={last_http_detail}")

    log_excerpt = _container_log_excerpt(container)
    if log_excerpt:
        details.append(f"logs:\n{log_excerpt}")

    raise RuntimeError(
        f"Service on port {port} failed readiness check after {timeout}s ({'; '.join(details)})"
    )


async def stop_lab(db: AsyncSession, lab: Lab) -> None:
    """Stop and remove a lab container + network."""
    template = await db.get(LabTemplate, lab.template_id)
    lab.status = LabStatus.stopping
    db.add(lab)
    await db.commit()

    try:
        await asyncio.to_thread(_stop_sync, lab, template)
        lab.status = LabStatus.stopped
        lab.stopped_at = datetime.now(timezone.utc)
    except Exception as e:
        logger.error("Error stopping lab %s: %s", lab.id, e)
        lab.status = LabStatus.stopped
        lab.stopped_at = datetime.now(timezone.utc)

    lab.web_url = None
    lab.ssh_host = None
    lab.ssh_port = None
    lab.ssh_user = None
    lab.ssh_password = None
    db.add(lab)
    await db.commit()


def _stop_sync(lab: Lab, template: LabTemplate | None) -> None:
    """Synchronous Docker cleanup — runs in a thread."""
    client = get_docker_client()
    profile = get_runtime_profile(template)

    if lab.container_id:
        try:
            container = client.containers.get(lab.container_id)
            container.stop(timeout=profile.stop_timeout_seconds)
            container.remove(force=True)
        except docker.errors.NotFound:
            pass
        except Exception as e:
            logger.warning("Error removing container: %s", e)

    if lab.network_id:
        try:
            network = client.networks.get(lab.network_id)
            _remove_network(network)
        except docker.errors.NotFound:
            pass
        except Exception as e:
            logger.warning("Error removing network: %s", e)

    if profile.requires_storage_volume:
        _remove_storage_volume(client, lab.id.hex)
