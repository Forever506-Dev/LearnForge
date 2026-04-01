FROM ghcr.io/engineer-man/piston

COPY install-runtimes.sh /piston/install-runtimes.sh
RUN chmod +x /piston/install-runtimes.sh

ENTRYPOINT ["/bin/bash", "-c", "/piston/install-runtimes.sh && /piston/launch"]
