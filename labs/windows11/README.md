# LearnForge — Windows 11 Instant-Boot Lab

Pre-installed Windows 11 Enterprise (Evaluation) running in QEMU/noVNC with
ephemeral COW overlays for instant-boot lab sessions (~30s boot instead of ~15 min).

## How It Works

The base qcow2 is converted from Microsoft's free Windows 11 Development
Environment VHDX. Each container creates a thin COW overlay backed by this
pre-installed image. Changes during the session are captured in the overlay
and discarded when the container is removed. Multiple users can run Windows 11
concurrently.

## ⚠️ Host Requirements

- Linux host with KVM enabled (`/dev/kvm` must exist)
- Docker run flags: `--device /dev/kvm --cap-add NET_ADMIN`
- Minimum 4GB RAM available per container

## Rebuilding the Base Image

If you need to update the pre-installed qcow2 (e.g. for a newer Windows build):

```bash
# 1. Download the Microsoft Dev Environment VHDX (~22GB zip)
curl -Lo WinDev.zip "https://aka.ms/windev_VM_hyperv"

# 2. Extract the VHDX
unzip WinDev.zip  # yields WinDevXXXXEval.vhdx

# 3. Convert VHDX → compressed qcow2
qemu-img convert -p -c -f vhdx -O qcow2 WinDevXXXXEval.vhdx windows11-base.qcow2

# 4. Build the image
docker build -t learnforge/windows11:latest .
```

## Credentials

- **Username:** User
- **Password:** *(empty — auto-login)*

## Access

| Port | Protocol | Purpose |
|------|----------|---------|
| 8006 | HTTP/WS  | noVNC browser desktop |
| 5900 | TCP      | Raw VNC |
| 3389 | TCP      | RDP |
