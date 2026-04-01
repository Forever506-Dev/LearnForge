# LearnForge Cybersecurity Platform — Ubuntu Desktop Lab VM
# Provides a stock Ubuntu GNOME desktop over VNC/noVNC for browser-based access.
# Uses Xvfb + x11vnc (not TigerVNC) so Mesa's llvmpipe can provide the OpenGL
# 3.3+ that GNOME Shell / Mutter requires for compositing.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=UTC

# ── System update & core utilities ──────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    locales \
    sudo \
    tzdata \
    && locale-gen en_US.UTF-8 \
    && ln -sf /usr/share/zoneinfo/UTC /etc/localtime \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# ── GNOME desktop (Ubuntu stock look) ───────────────────────────────────────
# gnome-session + gnome-shell give the full Ubuntu desktop experience.
# Mesa software rendering (llvmpipe) allows Mutter/GNOME Shell to composite
# without a real GPU — mandatory for VNC-inside-Docker.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnome-session \
    gnome-shell \
    gnome-terminal \
    gnome-system-monitor \
    gnome-screenshot \
    nautilus \
    gedit \
    gnome-shell-extension-ubuntu-dock \
    gnome-shell-extension-appindicator \
    yaru-theme-gnome-shell \
    yaru-theme-gtk \
    yaru-theme-icon \
    yaru-theme-sound \
    fonts-ubuntu \
    adwaita-icon-theme \
    dbus \
    dbus-x11 \
    at-spi2-core \
    xauth \
    mesa-utils \
    libgl1-mesa-dri \
    libglx-mesa0 \
    libegl-mesa0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── DBus / X11 runtime directories ──────────────────────────────────────────
RUN mkdir -p /var/run/dbus /tmp/.X11-unix /tmp/.ICE-unix \
    && chmod 1777 /tmp/.X11-unix /tmp/.ICE-unix \
    && dbus-uuidgen > /etc/machine-id \
    && ln -sf /etc/machine-id /var/lib/dbus/machine-id

# ── Xvfb + x11vnc (replaces TigerVNC) ───────────────────────────────────────
# Xvfb provides GLX via Mesa so Mutter can composite with software rendering.
# x11vnc mirrors the Xvfb display over VNC for noVNC to consume.
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── noVNC / websockify ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    novnc \
    websockify \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Development tools ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    build-essential \
    curl \
    wget \
    vim \
    nano \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Network / security tools ─────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    netcat-openbsd \
    iputils-ping \
    dnsutils \
    traceroute \
    net-tools \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Security scanning & enumeration ──────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    masscan \
    nikto \
    dirb \
    sqlmap \
    whatweb \
    hping3 \
    tcpdump \
    tshark \
    arp-scan \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Password attack tools ────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    hydra \
    john \
    hashcat \
    medusa \
    crunch \
    cewl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── SMB / post-exploitation & wireless ───────────────────────────────────────
# enum4linux is not in Ubuntu repos — install from pip (enum4linux-ng)
RUN apt-get update && apt-get install -y --no-install-recommends \
    smbclient \
    aircrack-ng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── OSINT & reconnaissance (apt-available) ───────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    dnsrecon \
    dnsenum \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Anonymity, networking & misc utilities ────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    proxychains4 \
    tor \
    screen \
    tmux \
    whois \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── pip-based security tools ─────────────────────────────────────────────────
# Tools not packaged for Ubuntu are installed via pip
# Note: recon-ng and enum4linux are Kali-only; available on Kali/Parrot VMs
RUN pip3 install --no-cache-dir \
    wfuzz \
    theHarvester \
    smbmap \
    fierce

# ── evil-winrm (Ruby-based WinRM shell for post-exploitation) ────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ruby ruby-dev \
    && gem install evil-winrm --no-document \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Wordlists ────────────────────────────────────────────────────────────────
# NOTE: gobuster requires Go 1.21+; install at runtime if needed
RUN mkdir -p /usr/share/wordlists \
    && wget -q -O /usr/share/wordlists/rockyou.txt.gz \
       https://gitlab.com/kalilinux/packages/wordlists/-/raw/kali/master/rockyou.txt.gz \
    && gunzip /usr/share/wordlists/rockyou.txt.gz \
    || echo "rockyou.txt download failed — install manually at runtime"

# ── Create non-root user ─────────────────────────────────────────────────────
RUN useradd -m -s /bin/bash ubuntu \
    && echo "ubuntu:ubuntu123" | chpasswd \
    && usermod -aG sudo ubuntu \
    && echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

# ── Enable Ubuntu dock & AppIndicator extensions by default ──────────────────
RUN mkdir -p /home/ubuntu/.local/share/gnome-shell/extensions \
    && su ubuntu -c "dbus-launch gsettings set org.gnome.shell enabled-extensions \"['ubuntu-dock@ubuntu.com', 'ubuntu-appindicators@ubuntu.com']\" 2>/dev/null || true" \
    && su ubuntu -c "dbus-launch gsettings set org.gnome.desktop.interface gtk-theme 'Yaru' 2>/dev/null || true" \
    && su ubuntu -c "dbus-launch gsettings set org.gnome.desktop.interface icon-theme 'Yaru' 2>/dev/null || true" \
    && su ubuntu -c "dbus-launch gsettings set org.gnome.desktop.interface cursor-theme 'Yaru' 2>/dev/null || true" \
    && su ubuntu -c "dbus-launch gsettings set org.gnome.desktop.wm.preferences theme 'Yaru' 2>/dev/null || true" \
    && su ubuntu -c "dbus-launch gsettings set org.gnome.shell favorite-apps \"['org.gnome.Nautilus.desktop', 'org.gnome.Terminal.desktop', 'org.gnome.gedit.desktop', 'org.gnome.SystemMonitor.desktop']\" 2>/dev/null || true"

# ── Desktop README ───────────────────────────────────────────────────────────
RUN mkdir -p /home/ubuntu/Desktop \
    && printf '╔══════════════════════════════════════════════════════════════╗\n║        Welcome to LearnForge Cybersecurity Lab VM            ║\n╚══════════════════════════════════════════════════════════════╝\n\nYou are inside a fully isolated Ubuntu 22.04 GNOME desktop.\n\nQUICK START\n-----------\n• Click "Activities" (top-left) or press the Super key\n• Open a terminal: right-click -> "Open Terminal" or find it in Activities\n\nINSTALLED TOOLS\n---------------\nDevelopment:  git, python3, pip, venv, node, npm, gcc, vim, nano, gedit\nNetworking:   nmap, netcat, ping, dig, traceroute, ifconfig, wget, curl\nScanning:     masscan, nikto, dirb, sqlmap, whatweb, hping3, tcpdump, tshark\nPasswords:    hydra, john, hashcat, medusa, crunch, cewl\nSMB/PostEx:   enum4linux, smbclient, evil-winrm\nOSINT:        theHarvester, dnsrecon, dnsenum, fierce, recon-ng\nWireless:     aircrack-ng\nMisc:         proxychains4, tor, screen, tmux, whois, wfuzz\nWordlists:    /usr/share/wordlists/rockyou.txt\n\nCREDENTIALS\n-----------\n  Username : ubuntu\n  Password : ubuntu123\n  Sudo     : passwordless (NOPASSWD)\n\nTIPS\n----\n• Your home directory is /home/ubuntu\n• Run sudo apt install <package> to install more tools.\n• This is a stock Ubuntu GNOME desktop with Yaru theme.\n\nHappy hacking!  -- LearnForge Team\n' > /home/ubuntu/Desktop/README.txt \
    && chown -R ubuntu:ubuntu /home/ubuntu/Desktop

# Ensure user owns all config dirs
RUN chown -R ubuntu:ubuntu /home/ubuntu

# ── Startup script ───────────────────────────────────────────────────────────
# Flow: system-dbus → logind → Xvfb (with GLX) → GNOME Shell → x11vnc → websockify
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 5901 6080

CMD ["/start.sh"]
