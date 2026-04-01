#!/usr/bin/env bash
set -Eeuo pipefail

: "${STORAGE:=/lab-storage}"
: "${PARROT_BASE_IMAGE:=/opt/parrot/Parrot-security-7.1_amd64.qcow2}"
: "${PARROT_OVERLAY_IMAGE:=${STORAGE}/data.qcow2}"

# /run/entry.sh sources this hook before the upstream install/disk logic runs.
# We intentionally create the runtime overlay as data.qcow2 so qemux/qemu
# attaches it as the primary VM disk while BOOT=none prevents fallback downloads.
mkdir -p "${STORAGE}"

if [ ! -s "${PARROT_BASE_IMAGE}" ]; then
  echo "ERROR: missing Parrot base image at ${PARROT_BASE_IMAGE}" >&2
  exit 1
fi

overlay_needs_reset="Y"

if [ -s "${PARROT_OVERLAY_IMAGE}" ]; then
  backing_file="$(qemu-img info --output=json "${PARROT_OVERLAY_IMAGE}" | jq -r '."backing-filename" // empty' || true)"
  if [ "${backing_file}" = "${PARROT_BASE_IMAGE}" ]; then
    overlay_needs_reset="N"
  fi
fi

if [ "${overlay_needs_reset}" = "Y" ]; then
  mkdir -p "$(dirname "${PARROT_OVERLAY_IMAGE}")"
  rm -f "${PARROT_OVERLAY_IMAGE}"
  qemu-img create -f qcow2 -F qcow2 -b "${PARROT_BASE_IMAGE}" "${PARROT_OVERLAY_IMAGE}" >/dev/null
fi

if [ "${BASH_SOURCE[0]}" != "$0" ]; then
  return 0
fi

exit 0
