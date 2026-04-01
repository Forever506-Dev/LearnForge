#!/usr/bin/env bash
set -Eeuo pipefail

# LearnForge — Windows 11 pre-installed disk startup hook
# Runs BEFORE dockurr/windows install.sh via /run/entry.sh → /run/start.sh
#
# Creates an ephemeral COW overlay backed by the pre-installed base qcow2
# so each lab session boots in seconds instead of the 15-minute first install.
# UEFI vars are auto-created by dockurr/windows boot.sh on first boot.

: "${STORAGE:=/lab-storage}"
: "${WINDOWS_BASE_IMAGE:=/opt/windows/windows11-base.qcow2}"
: "${WINDOWS_BASE_VARS:=/opt/windows/windows11-base.vars}"
: "${WINDOWS_OVERLAY:=${STORAGE}/data.qcow2}"

mkdir -p "${STORAGE}"

# --- 1. Verify pre-installed base image exists ---------------------------
if [ ! -s "${WINDOWS_BASE_IMAGE}" ]; then
  echo "ERROR: missing Windows base image at ${WINDOWS_BASE_IMAGE}" >&2
  exit 1
fi

# --- 2. Create (or validate) ephemeral COW overlay -----------------------
overlay_ok="N"
if [ -s "${WINDOWS_OVERLAY}" ]; then
  backing="$(qemu-img info --output=json "${WINDOWS_OVERLAY}" 2>/dev/null \
    | jq -r '."backing-filename" // empty' || true)"
  [ "${backing}" = "${WINDOWS_BASE_IMAGE}" ] && overlay_ok="Y"
fi

if [ "${overlay_ok}" = "N" ]; then
  rm -f "${WINDOWS_OVERLAY}"
  qemu-img create -f qcow2 -F qcow2 \
    -b "${WINDOWS_BASE_IMAGE}" \
    "${WINDOWS_OVERLAY}" >/dev/null
fi

# --- 3. Restore pre-adapted UEFI vars (so every session starts post-adaptation)
if [ ! -s "${STORAGE}/windows.vars" ] && [ -s "${WINDOWS_BASE_VARS}" ]; then
  cp "${WINDOWS_BASE_VARS}" "${STORAGE}/windows.vars"
fi

# --- 4. Create markers so dockurr/windows skipInstall() succeeds --------
[ -f "${STORAGE}/windows.boot" ] || touch "${STORAGE}/windows.boot"
[ -f "${STORAGE}/windows.mode" ] || echo "windows" > "${STORAGE}/windows.mode"

if [ "${BASH_SOURCE[0]}" != "$0" ]; then
  return 0
fi

exit 0
