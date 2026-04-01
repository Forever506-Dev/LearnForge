# syntax=docker/dockerfile:1.7

ARG QEMU_BASE_IMAGE=qemux/qemu:latest
FROM ${QEMU_BASE_IMAGE} AS qemu-base

FROM debian:trixie-slim AS parrot-downloader

ARG PARROT_ARTIFACT=Parrot-security-7.1_amd64.qcow2
ARG PARROT_QCOW2_URL=https://deb.parrot.sh/parrot/iso/7.1/Parrot-security-7.1_amd64.qcow2
ARG PARROT_HASHES_URL=https://deb.parrot.sh/parrot/iso/7.1/signed-hashes.txt
ARG PARROT_KEY_URL=https://deb.parrot.sh/parrot/misc/archive.gpg
ARG PARROT_QCOW2_SHA256=fa4d1f1fe02eba2b20143353200e3d4e7d8a0255fed3f55fa849fe23d2e50471

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gpg \
        gpgv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/parrot-build

RUN set -eux; \
    curl -fL --retry 5 --retry-all-errors -o "${PARROT_ARTIFACT}" "${PARROT_QCOW2_URL}"; \
    curl -fL --retry 5 --retry-all-errors -o signed-hashes.txt "${PARROT_HASHES_URL}"; \
    curl -fL --retry 5 --retry-all-errors -o archive.asc "${PARROT_KEY_URL}"; \
    gpg --batch --yes --dearmor -o archive.gpg archive.asc; \
    gpgv --keyring ./archive.gpg signed-hashes.txt; \
    expected_hash="$(awk -v artifact="${PARROT_ARTIFACT}" '$1 == "sha256" { section = 1; next } $1 == "sha512" { section = 0 } section && $2 == artifact { print $1; exit }' signed-hashes.txt)"; \
    test -n "${expected_hash}"; \
    test "${expected_hash}" = "${PARROT_QCOW2_SHA256}"; \
    printf '%s  %s\n' "${PARROT_QCOW2_SHA256}" "${PARROT_ARTIFACT}" | sha256sum -c -; \
    mkdir -p /opt/parrot; \
    mv "${PARROT_ARTIFACT}" "/opt/parrot/${PARROT_ARTIFACT}"; \
    cp signed-hashes.txt /opt/parrot/signed-hashes.txt; \
    rm -rf /opt/parrot-build

FROM scratch

# Copy the upstream QEMU/noVNC runtime filesystem without inheriting its
# /storage volume metadata so session state stays container-local and ephemeral.
COPY --from=qemu-base / /
COPY --from=parrot-downloader /opt/parrot/ /opt/parrot/
COPY --chmod=755 start-hook.sh /run/start.sh

LABEL org.opencontainers.image.title="LearnForge Parrot Security 7.1 Lab" \
      org.opencontainers.image.description="Official Parrot Security 7.1 qcow2 running in a QEMU/noVNC container for ephemeral browser labs."

ENV APP="Parrot Security 7.1 VM" \
    SUPPORT="https://www.parrotsec.org/docs/virtualization/" \
    VM_NET_HOST="parrot-security-7-1-vm" \
    BOOT="none" \
    BOOT_MODE="uefi" \
    STORAGE="/lab-storage" \
    PARROT_BASE_IMAGE="/opt/parrot/Parrot-security-7.1_amd64.qcow2" \
    PARROT_OVERLAY_IMAGE="/lab-storage/data.qcow2" \
    KVM="Y" \
    NETWORK="slirp" \
    DISPLAY="web" \
    WEB_PORT="8006" \
    VNC_PORT="5900" \
    CPU_CORES="2" \
    RAM_SIZE="4G" \
    RAM_CHECK="N" \
    DISK_TYPE="sata" \
    DISK_IO="threads" \
    DISK_CACHE="writeback" \
    ALLOCATE="N"

EXPOSE 5900 8006

ENTRYPOINT ["/usr/bin/tini", "-s", "/run/entry.sh"]
