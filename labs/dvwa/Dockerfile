# LearnForge — Damn Vulnerable Web Application (DVWA) Lab
# Web-protocol lab: exposes only port 80 (Apache + PHP + MySQL).
# Students attack it from the browser via the web preview panel.

FROM vulnerables/web-dvwa:latest

# Ensure the startup script runs MySQL + Apache
# The base image already has /main.sh that initialises the DB and starts services.

EXPOSE 80

CMD ["/main.sh"]
