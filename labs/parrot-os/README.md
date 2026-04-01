# Parrot OS lab image

This lab now runs the official Parrot Security 7.1 `qcow2` image inside a QEMU/noVNC container instead of a fake Ubuntu desktop.

## What changed

- Uses the upstream Parrot artifact: `Parrot-security-7.1_amd64.qcow2`
- Verifies the downloaded artifact against Parrot's signed hash manifest during `docker build`
- Exposes the browser console on the upstream QEMU/noVNC port:
  - HTTP noVNC: `8006`
  - Raw VNC: `5900`

## Ephemeral session model

The baked-in official `qcow2` is stored read-only in the image at build time.

At container startup, `start-hook.sh` creates a writable `qcow2` overlay at `/lab-storage/data.qcow2` with the official image as its backing file. That means:

- no multi-GB Parrot download on each session start
- users can still install packages and modify the VM during the session
- all changes disappear when the lab container is deleted
- no runtime persistence volume is required for guest state

`/lab-storage` is used intentionally instead of the upstream image's `/storage` path so runtime state remains container-local instead of depending on a Docker volume.

The overlay is created as `data.qcow2` on purpose: that matches the upstream `qemux/qemu` primary disk slot, while `BOOT=none` simply prevents the runtime from trying to download a fallback OS if the overlay is missing.

## Runtime assumptions

- The runtime profile is expected to pass `/dev/kvm`, `/dev/net/tun`, and `NET_ADMIN` so the VM can boot with hardware acceleration and browser networking
- `NETWORK=slirp` keeps guest networking available for package installs while still keeping the session disposable
- `BOOT_MODE=legacy` is the chosen default for this official desktop VM artifact; override it at runtime if upstream firmware expectations differ
- The VM is sized for a usable KDE desktop (`CPU_CORES=2`, `RAM_SIZE=4G`)

## Credentials

This image does **not** create or change guest credentials. Users will see whatever login experience ships in the official upstream Parrot VM image.

If the platform surfaces default credentials elsewhere (for example from seeded metadata), keep that metadata synchronized separately with the upstream Parrot artifact. That follow-up is intentionally outside this folder's scope.
