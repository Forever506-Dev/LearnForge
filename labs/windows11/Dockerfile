# syntax=docker/dockerfile:1.7
#
# LearnForge — Windows 11 Instant-Boot VM
# Pre-installed Windows 11 Enterprise (Evaluation) with ephemeral COW overlay.
# Each lab session boots in ~30 seconds instead of the 15-minute first install.
#
# Build requires:
#   - windows11-base.qcow2  (converted from Microsoft Dev Environment VHDX)
#
# Protocol: noVNC web (port 8006) — browser-accessible Windows desktop
# Requires host KVM: --device /dev/kvm --cap-add NET_ADMIN

# --- Stage 1: import dockurr/windows runtime (QEMU + noVNC + boot scripts)
FROM dockurr/windows AS windows-base

# --- Stage 2: final image without inherited VOLUME /storage metadata
FROM scratch

COPY --from=windows-base / /

# Pre-installed Windows 11 disk (read-only base for COW overlays)
COPY windows11-base.qcow2 /opt/windows/windows11-base.qcow2

# Pre-adapted UEFI vars (post-hardware-adaptation UEFI state for instant boot)
COPY windows11-base.vars /opt/windows/windows11-base.vars

# Startup hook: creates ephemeral overlay + markers before dockurr boot logic
COPY --chmod=755 start-hook.sh /run/start.sh

LABEL org.opencontainers.image.title="LearnForge Windows 11 Lab" \
      org.opencontainers.image.description="Pre-installed Windows 11 Enterprise in QEMU/noVNC for instant-boot browser labs."

ENV APP="Windows 11 Enterprise VM" \
    VERSION="win11x64-enterprise-eval" \
    BOOT="none" \
    STORAGE="/lab-storage" \
    WINDOWS_BASE_IMAGE="/opt/windows/windows11-base.qcow2" \
    VM_NET_HOST="windows-11-vm" \
    KVM="Y" \
    NETWORK="slirp" \
    ADAPTER="e1000" \
    DNS_SERVER="8.8.8.8" \
    DISPLAY="web" \
    VGA="std" \
    WEB_PORT="8006" \
    VNC_PORT="5900" \
    CPU_CORES="2" \
    RAM_SIZE="4G" \
    RAM_CHECK="N" \
    DISK_FMT="qcow2" \
    DISK_TYPE="sata" \
    DISK_IO="threads" \
    DISK_CACHE="writeback" \
    ALLOCATE="N" \
    LOGO="N" \
    USERNAME="User" \
    PASSWORD="" \
    LANGUAGE="en-US" \
    KEYBOARD="en-US" \
    REGION="en-US"

EXPOSE 5900 8006 3389

ENTRYPOINT ["/usr/bin/tini", "-s", "/run/entry.sh"]
