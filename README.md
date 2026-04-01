<div align="center">

# ⚔️ LearnForge

### Hands-On Cybersecurity Training Platform

**Interactive Labs · Coding Challenges · Full Desktop VMs · CTF-Style Learning**

<br/>

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

<br/>

![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Docker-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen?style=flat-square)

</div>

<br/>

---

<br/>

## 📖 Overview

LearnForge is an **open-source, hands-on cybersecurity training platform** that spins up real, isolated Docker-based lab environments directly in the browser. Students learn by doing — exploiting intentionally vulnerable machines, completing coding challenges across multiple languages, and advancing through structured learning paths.

No VM setup required. No local tooling. Everything runs in Docker.

<br/>

### ✨ Key Features

| Feature | Description |
|:--------|:------------|
| 🧪 **Live Hacking Labs** | Docker-based isolated environments — SSH, Web, and full desktop VMs |
| 🖥️ **In-Browser Terminal** | xterm.js SSH terminal proxied securely via WebSocket |
| 🖱️ **Full Desktop VMs** | Kali Linux, Parrot OS, Ubuntu Desktop & Windows 11 via noVNC |
| 💻 **Coding Challenges** | Multi-language code execution (Python, C, Go, Rust, Node, Lua) powered by Piston |
| 📚 **Learning Paths** | Structured paths with lessons, quizzes, and challenges |
| 🏆 **Gamification** | XP points, leaderboard, and progress tracking |
| 🔐 **Hardened Auth** | Argon2id hashing, JWT access + refresh tokens, Redis token blacklist |
| 🛡️ **Rate Limiting** | Per-IP rate limiting on all auth endpoints via slowapi |
| 👤 **Admin Panel** | Full CRUD for paths, modules, sections, and lab templates |
| 🐳 **One-Command Deploy** | Full stack via `docker compose up` |

<br/>

---

<br/>

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        LearnForge Platform                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  Nginx Reverse Proxy (:80)                 │  │
│  │          (Security headers · TLS termination)              │  │
│  └────────────┬───────────────────────┬────────────┬──────────┘  │
│               │                       │            │             │
│               ▼                       ▼            ▼             │
│  ┌────────────────────┐  ┌────────────────┐  ┌──────────────┐    │
│  │  Frontend          │  │  Backend API   │  │  SSH Proxy   │    │
│  │  React + Vite      │  │  FastAPI       │  │  Node.js     │    │
│  │  TypeScript        │  │  Python 3.11+  │  │  ws + ssh2   │    │
│  │  Tailwind CSS      │  │                │  │  (:2222)     │    │
│  └────────────────────┘  │  ┌──────────┐  │  └──────────────┘    │
│                          │  │ Routers  │  │                      │
│                          │  │ auth     │  │  ┌──────────────┐    │
│                          │  │ learn    │  │  │  Piston      │    │
│                          │  │ labs     │  │  │  Code Runner │    │
│                          │  │ code     │  │  │  (:2000)     │    │
│                          │  │ admin    │  │  └──────────────┘    │
│                          │  │ profile  │  │                      │
│                          │  │ gamify   │  │                      │
│                          │  └──────────┘  │                      │
│                          └───────┬────────┘                      │
│                                  │                               │
│  ┌───────────────────────────────┼──────────────────────────┐    │
│  │             Data Layer        │                          │    │
│  │  ┌───────────┐  ┌─────────────┴──┐  ┌────────────────┐   │    │
│  │  │PostgreSQL │  │     Redis      │  │  Docker Engine │   │    │
│  │  │(Metadata) │  │(Token Blacklist│  │  (Lab runtime) │   │    │
│  │  │           │  │ + Leaderboard) │  │                │   │    │
│  │  └───────────┘  └────────────────┘  └────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                  │                               │
│         ┌────────────────────────┼─────────────────────┐         │
│         ▼                        ▼                     ▼         │
│  ┌─────────────┐      ┌──────────────────┐    ┌─────────────┐    │
│  │ SSH Lab     │      │ Desktop VM Lab   │    │ Web Lab     │    │
│  │ (Docker)    │      │ Kali/Parrot/     │    │ DVWA        │    │
│  │ vuln-ssh    │      │ Ubuntu/Windows   │    │ (Docker)    │    │
│  │ shellshock  │      │ (noVNC + KVM)    │    │             │    │
│  └─────────────┘      └──────────────────┘    └─────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

<br/>

---

<br/>

## 🧪 Lab Environments

LearnForge ships with a collection of intentionally vulnerable environments for hands-on security training:

| Lab | Protocol | Description |
|:----|:---------|:------------|
| 🐧 **Vuln SSH** | SSH | Linux privilege escalation — SUID binaries, sudo misconfigs, writable crontab |
| 💥 **ShellShock** | SSH + Web | CVE-2014-6271 — vulnerable Bash 4.2 CGI endpoint on Apache |
| 🌐 **DVWA** | Web | Damn Vulnerable Web App — SQLi, XSS, CSRF, file inclusion, command injection |
| 🦜 **Parrot OS** | noVNC | Official Parrot Security 7.1 full desktop VM |
| ⚔️ **Kali Linux** | noVNC | Kali Linux full desktop VM with complete pentesting toolset |
| 🖥️ **Ubuntu Desktop** | noVNC | Ubuntu Desktop for general Linux and scripting practice |
| 🪟 **Windows 11** | noVNC | Windows 11 VM (KVM) for Windows-based security exercises |

> All lab containers run in isolated Docker networks. Each student session is independent — labs are automatically cleaned up after a configurable TTL.

<br/>

---

<br/>

## 📁 Project Structure

```
LearnForge/
│
├── 🐍 backend/                  Python FastAPI backend
│   ├── app/
│   │   ├── auth.py              Argon2id hashing, JWT helpers, Redis blacklist
│   │   ├── config.py            Pydantic settings (reads from .env)
│   │   ├── database.py          Async SQLAlchemy engine + session
│   │   ├── gamification.py      XP award logic, leaderboard
│   │   ├── main.py              FastAPI app entry-point, lifespan, CORS
│   │   ├── models.py            SQLAlchemy ORM models
│   │   ├── schemas.py           Pydantic request/response schemas
│   │   ├── labs/                Lab orchestration subsystem
│   │   │   ├── manager.py       Docker-based lab provisioner
│   │   │   ├── router.py        Lab API routes + SSH/noVNC/web proxy
│   │   │   ├── governance.py    Concurrency limits, TTL enforcement
│   │   │   ├── cleanup.py       Background cleanup loop
│   │   │   ├── models.py        LabTemplate + Lab ORM models
│   │   │   └── schemas.py       Lab request/response schemas
│   │   └── routers/
│   │       ├── auth.py          Register, login, refresh, logout
│   │       ├── learn.py         Learning content API
│   │       ├── paths.py         Learning paths API
│   │       ├── code.py          Code execution (Piston)
│   │       ├── admin.py         Admin CRUD
│   │       ├── profile.py       User profile management
│   │       └── leaderboard.py   XP leaderboard
│   ├── alembic/                 Database migrations
│   ├── scripts/
│   │   ├── seed_content.py      Seeds default admin + learning content
│   │   └── seed_labs.py         Seeds lab templates + guided exercises
│   ├── content/                 YAML/JSON learning content definitions
│   ├── Dockerfile
│   ├── entrypoint.sh            Runs migrations + seeds, then starts API
│   └── requirements.txt
│
├── ⚛️  frontend/                 React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── api/client.ts        Axios instance with JWT auto-refresh
│   │   ├── hooks/useAuth.tsx    Auth context provider
│   │   ├── pages/               Route-level page components
│   │   │   ├── Dashboard.tsx    Home dashboard
│   │   │   ├── Learn.tsx        Learning paths browser
│   │   │   ├── LabSession.tsx   Lab environment (terminal / noVNC / web)
│   │   │   ├── Leaderboard.tsx  XP leaderboard
│   │   │   ├── Login.tsx        Login page
│   │   │   └── Register.tsx     Registration page
│   │   └── components/          Reusable UI components
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
│
├── 🔌 ssh-proxy/                Node.js WebSocket → SSH proxy
│   ├── server.js                JWT-authenticated xterm.js bridge
│   └── package.json
│
├── 🐳 labs/                     Docker images for lab environments
│   ├── vuln-ssh/               Linux privesc lab (intentionally vulnerable)
│   ├── shellshock/             CVE-2014-6271 Apache CGI lab
│   ├── dvwa/                   Damn Vulnerable Web Application
│   ├── kali-linux/             Kali Linux full desktop VM
│   ├── parrot-os/              Parrot Security 7.1 VM
│   ├── ubuntu-desktop/         Ubuntu Desktop VM
│   └── windows11/              Windows 11 VM (KVM, requires hardware virt.)
│
├── 🌐 nginx/
│   └── default.conf            Reverse proxy config with security headers
│
├── 📜 scripts/                  Management helper scripts
│   ├── start.sh / start.ps1    Start the full stack
│   ├── stop.sh / stop.ps1      Stop all services
│   ├── restart.sh / restart.ps1
│   ├── logs.sh / logs.ps1      Tail service logs
│   ├── status.sh / status.ps1  Show container status
│   └── clean.sh / clean.ps1    Tear down + wipe volumes
│
├── .env.example                 Environment template — copy to .env
├── .gitignore
├── SECURITY.md                  Vulnerability disclosure policy
└── docker-compose.yml           Full infrastructure definition
```

<br/>

---

<br/>

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Used For |
|:-----|:--------|:---------|
| **Docker** | 24+ | All services + lab containers |
| **Docker Compose** | V2 | Stack orchestration |
| **KVM** *(optional)* | — | Windows 11 and full-desktop VM labs only |

> **Note:** Python, Node.js, and Rust are only needed if you want to run services outside Docker.

<br/>

### 1️⃣ Clone & Configure

```bash
git clone https://github.com/TheLastWorld_Owner/LearnForge.git
cd LearnForge

# Copy the environment template and fill in your values
cp .env.example .env
```

Open `.env` and set:

```env
# Generate with: openssl rand -hex 32
JWT_SECRET=your_64_char_random_secret_here

# Choose a strong password — this creates your first admin account
DEFAULT_ADMIN_PASSWORD=YourStrongAdminPassword1!
```

<br/>

### 2️⃣ Start the Stack

```bash
docker compose up --build -d
```

This pulls/builds and starts all services:

| Service | Port | Description |
|:--------|:-----|:------------|
| **nginx** | `80` | Reverse proxy (single entry point) |
| **api** | `8002` | FastAPI backend (also reachable via nginx) |
| **frontend** | `5174` | React dev server (also reachable via nginx) |
| **postgres** | — | PostgreSQL (internal only) |
| **redis** | — | Redis (internal only) |
| **piston** | — | Code runner (internal only) |
| **ssh-proxy** | — | SSH WebSocket proxy (internal only) |

> Open **http://localhost** — Nginx routes everything through port 80.

<br/>

### 3️⃣ Log In

The default admin account is created automatically on first start:

- **Email:** `admin@learnforge.dev` *(or whatever you set in `.env`)*
- **Password:** your `DEFAULT_ADMIN_PASSWORD`

<br/>

### 4️⃣ Build Lab Images

Labs are separate Docker images. Build the ones you need:

```bash
# Build all standard labs
docker compose build vuln-ssh-build shellshock-build dvwa-build kali-linux-build ubuntu-desktop-build

# Parrot OS (downloads ~11.7 GB image — run once manually)
docker compose --profile parrot-os build parrot-os-build

# Windows 11 (requires KVM + base image files in labs/windows11/)
docker compose --profile windows11 build windows11-build
```

<br/>

---

<br/>

## ⚙️ Tech Stack

<table>
  <thead>
    <tr>
      <th>Layer</th>
      <th>Technology</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>⚛️ Frontend</strong></td>
      <td>React 18 · TypeScript · Vite · Tailwind CSS</td>
      <td>SPA — learning paths, labs, leaderboard</td>
    </tr>
    <tr>
      <td><strong>🐍 Backend</strong></td>
      <td>Python · FastAPI · SQLAlchemy 2 · Alembic</td>
      <td>REST API, WebSocket proxy, lab orchestration</td>
    </tr>
    <tr>
      <td><strong>🔐 Auth</strong></td>
      <td>Argon2id · python-jose (JWT) · slowapi</td>
      <td>Password hashing, token issuance, rate limiting</td>
    </tr>
    <tr>
      <td><strong>🖥️ Terminal</strong></td>
      <td>Node.js · ws · ssh2 · xterm.js</td>
      <td>Browser SSH terminal via WebSocket proxy</td>
    </tr>
    <tr>
      <td><strong>🖱️ Desktop VMs</strong></td>
      <td>noVNC · KVM (optional)</td>
      <td>Full desktop environments in the browser</td>
    </tr>
    <tr>
      <td><strong>💻 Code Execution</strong></td>
      <td>Piston (engineer-man)</td>
      <td>Sandboxed multi-language code runner</td>
    </tr>
    <tr>
      <td><strong>🗄️ Database</strong></td>
      <td>PostgreSQL 16</td>
      <td>Users, content, progress, lab state</td>
    </tr>
    <tr>
      <td><strong>⚡ Cache</strong></td>
      <td>Redis 7</td>
      <td>JWT blacklist, leaderboard, lab progress events</td>
    </tr>
    <tr>
      <td><strong>🌐 Proxy</strong></td>
      <td>Nginx 1.25</td>
      <td>Reverse proxy, WebSocket support, security headers</td>
    </tr>
    <tr>
      <td><strong>🐳 Labs</strong></td>
      <td>Docker Engine SDK</td>
      <td>Per-student isolated lab container lifecycle</td>
    </tr>
  </tbody>
</table>

<br/>

---

<br/>

## 🔐 Security Design

LearnForge is built with security-first principles throughout the stack:

| Area | Implementation |
|:-----|:---------------|
| **Password hashing** | Argon2id (time_cost=3, memory=64 MB, parallelism=4) |
| **JWT tokens** | Short-lived access tokens (15 min) + refresh tokens (7 days) |
| **Token revocation** | Redis JTI blacklist — logout immediately invalidates tokens |
| **Rate limiting** | Per-IP limits on `/auth/register` (5/min) and `/auth/login` (10/min) |
| **CORS** | Allowlist-based origins configured via environment variable |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `CSP` via Nginx |
| **Lab isolation** | Each lab runs in its own Docker container on an isolated network |
| **Lab governance** | Configurable max concurrent labs per user + automatic TTL cleanup |
| **Config validation** | App refuses to start if `JWT_SECRET` or admin password is a placeholder |

<br/>

> ⚠️ **Lab credentials** (`hacker/hacker123`, `admin/password`, etc.) are **intentionally insecure** — they belong to the vulnerable training containers and are part of the learning content. See [SECURITY.md](SECURITY.md) for full details.

<br/>

---

<br/>

## 🗺️ Learning Content

LearnForge organises content into **Paths → Modules → Sections**:

```
Path (e.g. "Web Security Fundamentals")
 └── Module (e.g. "SQL Injection")
      ├── Section: Lesson   (markdown + theory)
      ├── Section: Quiz     (multiple choice)
      └── Section: Coding Challenge  (live code runner)
```

Content is seeded from `backend/scripts/seed_content.py` and `seed_labs.py`. Admins can create, edit, and delete content via the admin panel or the `/api/admin` endpoints.

**Supported languages in coding challenges:**

`Python 3` · `C (GCC)` · `Go` · `Rust` · `Lua` · `Node.js`

<br/>

---

<br/>

## 🔧 Development Setup

To run services individually without Docker:

### Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL + Redis via Docker (deps only)
docker compose up postgres redis piston -d

# Run the API
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### SSH Proxy

```bash
cd ssh-proxy
npm install
JWT_SECRET=<your_secret> node server.js
```

<br/>

---

<br/>

## 📜 Management Scripts

Cross-platform helper scripts are included for common operations:

```bash
# Linux / macOS
./scripts/start.sh      # Start all services
./scripts/stop.sh       # Stop all services
./scripts/restart.sh    # Restart all services
./scripts/logs.sh       # Tail all service logs
./scripts/status.sh     # Show container status
./scripts/clean.sh      # Stop + remove all volumes (⚠️ data loss)

# Windows (PowerShell)
.\scripts\start.ps1
.\scripts\stop.ps1
.\scripts\restart.ps1
.\scripts\logs.ps1
.\scripts\status.ps1
.\scripts\clean.ps1
```

<br/>

---

<br/>

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Copy `.env.example` → `.env` and set real values before testing
4. Commit your changes
5. Open a pull request

Please read [SECURITY.md](SECURITY.md) before reporting any security issues.

<br/>

---

<br/>

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br/>

---

<br/>

<div align="center">

**Built with ❤️ for the cybersecurity community**

*Learn. Hack. Forge.*

</div>
