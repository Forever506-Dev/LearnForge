#!/bin/bash
set -e

# ── Clean stale X locks ──
rm -f /tmp/.X1-lock /tmp/.X11-unix/X1 2>/dev/null || true

# ── Temp dirs ──
mkdir -p /tmp/.X11-unix /tmp/.ICE-unix
chmod 1777 /tmp/.X11-unix /tmp/.ICE-unix

# ── System D-Bus ──
mkdir -p /var/run/dbus
dbus-uuidgen --ensure=/etc/machine-id
dbus-daemon --system --fork --nopidfile 2>/dev/null || true
echo "[LearnForge] System D-Bus started"

# ── systemd-logind (GNOME Shell requires org.freedesktop.login1) ──
mkdir -p /run/systemd/seats /run/systemd/users /run/systemd/machines \
         /run/systemd/inhibit /run/systemd/sessions
/usr/lib/systemd/systemd-logind &
LOGIND_PID=$!
sleep 1
if kill -0 "$LOGIND_PID" 2>/dev/null; then
  echo "[LearnForge] systemd-logind started (PID $LOGIND_PID)"
else
  echo "[LearnForge] WARNING: systemd-logind failed to start" >&2
fi

# ── Xvfb (virtual framebuffer with GLX for Mesa llvmpipe) ──
export LIBGL_ALWAYS_SOFTWARE=1
Xvfb :1 -screen 0 1280x800x24 +extension GLX &
XVFB_PID=$!
sleep 2
if ! kill -0 "$XVFB_PID" 2>/dev/null; then
  echo "[LearnForge] Xvfb failed to start" >&2
  exit 1
fi
echo "[LearnForge] Xvfb started on :1 (PID $XVFB_PID)"

# ── Launch GNOME Shell as ubuntu user ──
su ubuntu -c 'export DISPLAY=:1 HOME=/home/ubuntu LIBGL_ALWAYS_SOFTWARE=1 MUTTER_ALLOW_SOFTWARE_RENDERING=1 XDG_SESSION_TYPE=x11 XDG_CURRENT_DESKTOP=ubuntu:GNOME GNOME_SHELL_SESSION_MODE=ubuntu XDG_RUNTIME_DIR=/tmp/runtime-ubuntu && mkdir -p "$XDG_RUNTIME_DIR" && chmod 700 "$XDG_RUNTIME_DIR" && dbus-launch --exit-with-session gnome-shell --x11 &>/tmp/gnome-shell.log &'
sleep 5

# Verify GNOME Shell is running
if pgrep -x gnome-shell >/dev/null; then
  echo "[LearnForge] GNOME Shell is running"
else
  echo "[LearnForge] WARNING: GNOME Shell may not have started. Check /tmp/gnome-shell.log" >&2
fi

# ── x11vnc (mirrors Xvfb :1 over VNC on port 5900) ──
x11vnc -display :1 -rfbport 5901 -nopw -forever -shared -noxdamage -ncache 0 &
X11VNC_PID=$!
sleep 1
if ! kill -0 "$X11VNC_PID" 2>/dev/null; then
  echo "[LearnForge] x11vnc failed to start" >&2
  exit 1
fi
echo "[LearnForge] x11vnc started on port 5901 (PID $X11VNC_PID)"

# ── websockify (noVNC on port 6080 proxying to VNC 5900) ──
echo "[LearnForge] Starting noVNC websockify on port 6080..."
exec websockify --web=/usr/share/novnc 6080 localhost:5901
