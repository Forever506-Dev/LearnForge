# ============================================================
# LearnForge Cybersecurity Platform — Kali Linux Lab VM
# Base: kalilinux/kali-rolling
# Desktop: XFCE4 | VNC: TigerVNC | Web: noVNC/websockify
# ============================================================

FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=UTC

# ── Layer 1: Desktop + VNC + noVNC ──────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    kali-desktop-xfce \
    tigervnc-standalone-server \
    tigervnc-common \
    websockify \
    novnc \
    dbus-x11 \
    xauth \
    xfonts-base \
    sudo \
    curl \
    wget \
    tzdata \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2: Kali tools ──────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    kali-tools-top10 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \
    gobuster \
    dirb \
    nikto \
    sqlmap \
    netcat-openbsd \
    sshpass \
    enum4linux \
    smbclient \
    wordlists \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Extract rockyou if available (wordlists package ships it gzipped)
RUN rockyou-wordlist-update 2>/dev/null || true

# ── Layer 2b: Web Application Testing extras ─────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    dirbuster \
    wfuzz \
    whatweb \
    wafw00f \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2c: Network / Infrastructure extras ────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    masscan \
    hping3 \
    arp-scan \
    tshark \
    tcpdump \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2d: Exploitation extras ────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    exploitdb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2e: Password Attack extras ─────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    medusa \
    crunch \
    cewl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2f: Wireless extras ────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    reaver \
    pixiewps \
    bettercap \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2g: OSINT & Reconnaissance ─────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    theharvester \
    dnsrecon \
    dnsenum \
    fierce \
    recon-ng \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2h: Post-Exploitation ──────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    evil-winrm \
    smbmap \
    impacket-scripts \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2i: Anonymity / Misc utilities ─────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    proxychains4 \
    tor \
    screen \
    tmux \
    xterm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 3: User setup ──────────────────────────────────────
RUN useradd -m -s /bin/bash kali \
    && echo "kali:kali123" | chpasswd \
    && echo "kali ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/kali \
    && chmod 0440 /etc/sudoers.d/kali

# ── DBus / X11 runtime directories ────────────────────────────
RUN mkdir -p /var/run/dbus /tmp/.X11-unix /tmp/.ICE-unix \
    && chmod 1777 /tmp/.X11-unix /tmp/.ICE-unix \
    && dbus-uuidgen --ensure=/etc/machine-id \
    && mkdir -p /var/lib/dbus && ln -sf /etc/machine-id /var/lib/dbus/machine-id

# ── Layer 4: VNC xstartup ────────────────────────────────────
RUN mkdir -p /home/kali/.vnc && \
    printf '#!/bin/bash\nunset SESSION_MANAGER\nunset DBUS_SESSION_BUS_ADDRESS\nexport XDG_CURRENT_DESKTOP=XFCE\nexport XDG_SESSION_TYPE=x11\nexport XDG_RUNTIME_DIR="/tmp/runtime-kali"\nmkdir -p "$XDG_RUNTIME_DIR" && chmod 700 "$XDG_RUNTIME_DIR"\nvncconfig -nowin &\nexec dbus-launch --exit-with-session startxfce4\n' > /home/kali/.vnc/xstartup && \
    chmod +x /home/kali/.vnc/xstartup && \
    chown -R kali:kali /home/kali/.vnc

# Newer TigerVNC releases read the desktop session from ~/.config/tigervnc.
RUN mkdir -p /home/kali/.config/tigervnc && \
    printf 'session=xfce\n' > /home/kali/.config/tigervnc/config && \
    chown -R kali:kali /home/kali/.config/tigervnc

# ── Layer 5: Startup script ──────────────────────────────────
RUN printf '#!/bin/bash\n\
set -e\n\
rm -f /tmp/.X1-lock /tmp/.X11-unix/X1 /home/kali/.vnc/*.pid /home/kali/.vnc/*.log 2>/dev/null || true\n\
mkdir -p /tmp/.X11-unix /tmp/.ICE-unix && chmod 1777 /tmp/.X11-unix /tmp/.ICE-unix\n\
mkdir -p /var/run/dbus\n\
dbus-uuidgen --ensure=/etc/machine-id\n\
dbus-daemon --system --fork --nopidfile 2>/dev/null || true\n\
echo "[LearnForge] System D-Bus started"\n\
mkdir -p /home/kali/.vnc /home/kali/.config/tigervnc\n\
chown -R kali:kali /home/kali/.vnc /home/kali/.config/tigervnc\n\
chmod 700 /home/kali/.vnc /home/kali/.config/tigervnc\n\
su kali -c "export HOME=/home/kali && vncserver -kill :1 >/dev/null 2>&1 || true"\n\
echo "[LearnForge] Starting TigerVNC on display :1 (port 5901)..."\n\
if ! su kali -c "export HOME=/home/kali && vncserver :1 -geometry 1280x800 -depth 24 -localhost yes -SecurityTypes None"; then\n\
  echo "[LearnForge] TigerVNC failed to start" >&2\n\
  exit 1\n\
fi\n\
sleep 2\n\
if ! nc -z 127.0.0.1 5901 2>/dev/null; then\n\
  echo "[LearnForge] TigerVNC did not open port 5901" >&2\n\
  exit 1\n\
fi\n\
echo "[LearnForge] Starting noVNC websockify on port 6080..."\n\
exec websockify --web=/usr/share/novnc 6080 localhost:5901\n' > /start.sh && \
    chmod +x /start.sh

# ── Desktop README ───────────────────────────────────────────
RUN mkdir -p /home/kali/Desktop && \
    printf '=== LearnForge Cybersecurity Lab ===\n\
\n\
Welcome to the Kali Linux pentest environment.\n\
\n\
INSTALLED TOOLS (kali-tools-top10 + pentest-suite extras)\n\
---------------------------------------------------------\n\
Network Scanning    : nmap, masscan, hping3, arp-scan\n\
Packet Analysis     : wireshark, tshark, tcpdump\n\
Exploitation        : metasploit-framework, exploitdb (searchsploit)\n\
Web App Testing     : burpsuite, nikto, sqlmap, dirb, gobuster,\n\
                      dirbuster, wfuzz, whatweb, wafw00f\n\
Wireless            : aircrack-ng, reaver, pixiewps, bettercap\n\
Password Attacks    : john, hashcat, medusa, crunch, cewl\n\
OSINT / Recon       : theharvester, dnsrecon, dnsenum, fierce, recon-ng\n\
Post-Exploitation   : evil-winrm, smbmap, impacket-scripts\n\
SMB / Enum          : enum4linux, smbclient\n\
Anonymity / Misc    : proxychains4, tor, screen, tmux, xterm\n\
Connectivity        : netcat-openbsd, sshpass, curl, wget\n\
\n\
WORDLISTS\n\
---------\n\
Location : /usr/share/wordlists/\n\
rockyou  : /usr/share/wordlists/rockyou.txt (gunzip if .gz)\n\
\n\
VNC      : localhost:5901  (display :1)\n\
noVNC    : http://localhost:6080/vnc.html\n\
\n\
Happy hacking — ethically!\n' > /home/kali/Desktop/README.txt && \
    chown -R kali:kali /home/kali/Desktop

# ── Ports & entrypoint ───────────────────────────────────────
EXPOSE 5901 6080

CMD ["/start.sh"]
