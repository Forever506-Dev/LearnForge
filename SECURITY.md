# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (`main`) | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability in LearnForge, **please do not open a public GitHub issue**.

Instead, report it privately via:

- **GitHub Private Vulnerability Reporting** — use the *"Report a vulnerability"* button on the Security tab of this repository.
- **Email** — if the above is unavailable, email the maintainers directly (see the GitHub profile for contact details).

We will acknowledge your report within **48 hours** and aim to provide a fix within **7 days** for critical issues.

## Intentionally Vulnerable Lab Environments

LearnForge is a cybersecurity training platform. Several Docker images bundled in `labs/` are **deliberately misconfigured or vulnerable** — this is by design:

| Lab | Intentional vulnerabilities |
|-----|-----------------------------|
| `labs/vuln-ssh` | SUID binaries, world-writable cron script, sudo misconfiguration; default credentials `hacker / hacker123` |
| `labs/shellshock` | Bash 4.2 (CVE-2014-6271) vulnerable CGI endpoint; default credentials `hacker / shellshock` |
| `labs/dvwa` | DVWA default credentials `admin / password`; SQL injection, XSS, CSRF, file inclusion, etc. |

**These credentials and vulnerabilities are part of the learning experience and are isolated inside Docker containers.** They are not secrets and are documented in `backend/scripts/seed_labs.py` as part of the lab content.

Do **not** report these as vulnerabilities — they are the product.

## Scope

The following are **in scope** for security reports:

- Authentication and authorisation flaws in the FastAPI backend
- JWT handling issues
- Injection vulnerabilities in the backend API
- Insecure direct object reference (IDOR) bugs
- Privilege escalation within the platform (not within lab containers)
- Secrets exposed in the repository or Docker images (outside the intentional lab images)

## Out of Scope

- Vulnerabilities inside the intentional lab containers (`labs/vuln-ssh`, `labs/dvwa`, `labs/shellshock`, etc.)
- Denial-of-service issues without security impact
- Missing security headers already addressed in `nginx/default.conf`
