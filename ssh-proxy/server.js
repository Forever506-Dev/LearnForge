"use strict";

const http = require("http");
const { WebSocketServer } = require("ws");
const { Client: SshClient } = require("ssh2");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const url = require("url");

const PORT = parseInt(process.env.PORT || "2222", 10);
const JWT_SECRET = process.env.JWT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8000";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "[ssh-proxy] FATAL: JWT_SECRET environment variable is not set or is too short " +
    "(minimum 32 characters). Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}

// ── HTTP server (health check + WebSocket upgrade) ─────────────

const httpServer = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// ── WebSocket server ────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade only for /ws/ssh/:labId paths
httpServer.on("upgrade", (req, socket, head) => {
  const parsed = url.parse(req.url, true);
  const match = parsed.pathname.match(/^\/ws\/ssh\/([^/]+)$/);

  if (!match) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, match[1]);
  });
});

wss.on("connection", async (ws, req, labId) => {
  const parsed = url.parse(req.url, true);
  const token = parsed.query.token;

  try {
    await handleSshConnection(ws, labId, token);
  } catch (err) {
    sendError(ws, err.message || "Internal proxy error");
  }
});

// ── Main connection handler ─────────────────────────────────────

async function handleSshConnection(ws, labId, token) {
  // 1. Validate JWT
  if (!token) {
    return sendError(ws, "Missing auth token");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error(`[${labId}] JWT validation failed:`, err.message);
    return sendError(ws, "Invalid or expired token");
  }
  console.log(`[${labId}] JWT validated for user ${decoded.sub}`);

  // 2. Fetch lab SSH credentials from backend API
  let labInfo;
  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/labs/${labId}/status`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }
    );
    labInfo = response.data;
  } catch (err) {
    const status = err.response?.status;
    console.error(`[${labId}] Backend API error: status=${status}`, err.message);
    if (status === 404) return sendError(ws, "Lab not found");
    if (status === 401 || status === 403) return sendError(ws, "Unauthorized");
    return sendError(ws, "Failed to fetch lab details");
  }

  // 3. Verify lab is running
  if (labInfo.status !== "running") {
    console.log(`[${labId}] Lab not running: ${labInfo.status}`);
    return sendError(ws, `Lab is not running (status: ${labInfo.status})`);
  }

  // 4. Extract SSH connection details
  const sshHost = labInfo.ssh_host;
  const sshPort = labInfo.ssh_port || 22;
  const sshUser = labInfo.ssh_user || "root";
  const sshPassword = labInfo.ssh_password || "";

  if (!sshHost) {
    console.error(`[${labId}] No SSH host in lab info`);
    return sendError(ws, "Lab has no SSH host configured");
  }

  console.log(`[${labId}] Connecting SSH → ${sshUser}@${sshHost}:${sshPort}`);

  // 5. Establish SSH connection
  const sshClient = new SshClient();

  let stream = null;
  let closed = false;

  function cleanup() {
    if (closed) return;
    closed = true;
    try { sshClient.end(); } catch (_) {}
    if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
      try { ws.close(); } catch (_) {}
    }
  }

  sshClient.on("ready", () => {
    console.log(`[${labId}] SSH session ready`);
    sshClient.shell({ term: "xterm-256color", cols: 80, rows: 24 }, (err, sh) => {
      if (err) {
        sendError(ws, `SSH shell error: ${err.message}`);
        cleanup();
        return;
      }

      stream = sh;

      // SSH stdout → WebSocket
      stream.on("data", (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      });

      // SSH stderr → WebSocket
      stream.stderr.on("data", (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      });

      stream.on("close", () => cleanup());
      stream.on("error", () => cleanup());

      // WebSocket → SSH stdin (or resize handling)
      ws.on("message", (msg) => {
        if (closed) return;

        // Try to parse as a resize command
        try {
          const text = msg.toString();
          const obj = JSON.parse(text);
          if (obj.type === "resize" && stream) {
            const cols = parseInt(obj.cols, 10) || 80;
            const rows = parseInt(obj.rows, 10) || 24;
            stream.setWindow(rows, cols, 0, 0);
            return;
          }
        } catch (_) {
          // Not JSON — treat as raw stdin
        }

        if (stream) {
          stream.write(msg);
        }
      });
    });
  });

  sshClient.on("error", (err) => {
    console.error(`[${labId}] SSH error:`, err.message);
    sendError(ws, `SSH connection error: ${err.message}`);
    cleanup();
  });

  ws.on("close", () => cleanup());
  ws.on("error", () => cleanup());

  // 6. Connect SSH
  sshClient.connect({
    host: sshHost,
    port: sshPort,
    username: sshUser,
    password: sshPassword,
    readyTimeout: 15000,
    keepaliveInterval: 10000,
  });
}

// ── Helpers ────────────────────────────────────────────────────

function sendError(ws, message) {
  if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
    try {
      ws.send(`\r\n\x1b[31mError: ${message}\x1b[0m\r\n`);
      ws.close(1011, message);
    } catch (_) {}
  }
}

// ── Start ──────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`ssh-proxy listening on port ${PORT}`);
});

// Crash resilience
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
