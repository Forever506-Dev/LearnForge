# LearnForge — Vulnerable SSH Lab Image
# Purpose: Linux privilege-escalation training via SSH.
# Default credentials: hacker / hacker123

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server \
    sudo \
    vim \
    nano \
    curl \
    python3 \
    cron \
    findutils \
    procps \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# ── SSH configuration ──────────────────────────────────────────
RUN mkdir -p /run/sshd
RUN sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "AllowUsers hacker" >> /etc/ssh/sshd_config

# ── Create vulnerable user ────────────────────────────────────
RUN useradd -m -s /bin/bash hacker && \
    echo "hacker:hacker123" | chpasswd

# ── Plant flags ────────────────────────────────────────────────
RUN echo "FLAG{user_shell_obtained}" > /home/hacker/user.txt && \
    chown hacker:hacker /home/hacker/user.txt && \
    chmod 600 /home/hacker/user.txt

RUN echo "FLAG{root_privilege_escalated}" > /root/root.txt && \
    chmod 600 /root/root.txt

# ── Vulnerability 1: SUID find ────────────────────────────────
RUN chmod u+s /usr/bin/find

# ── Vulnerability 2: SUID python3 ─────────────────────────────
RUN chmod u+s /usr/bin/python3 || chmod u+s /usr/bin/python3.11 || true

# ── Vulnerability 3: Writable crontab for root ────────────────
RUN echo "* * * * * root /opt/backup.sh" > /etc/cron.d/backup && \
    chmod 0644 /etc/cron.d/backup && \
    echo '#!/bin/bash\necho "backup running"' > /opt/backup.sh && \
    chmod 777 /opt/backup.sh

# ── Vulnerability 4: sudo misconfiguration ────────────────────
RUN echo "hacker ALL=(root) NOPASSWD: /usr/bin/vim" >> /etc/sudoers

# ── Hints for the student ─────────────────────────────────────
RUN echo '=== Welcome to the LearnForge SSH Lab ===\nYour mission: escalate from "hacker" to root.\nFind the flags in user.txt and root.txt.\nHint: look for SUID binaries and misconfigurations.\n' > /etc/motd

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
