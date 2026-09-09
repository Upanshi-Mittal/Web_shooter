// ─────────────────────────────────────────────────────────────
//  Web Shooter — Bridge Server
//  Connects the ESP32 hardware device to the browser game.
//
//  Endpoints
//    GET  /ping    → ESP32 heartbeat (returns "pong")
//    POST /shoot   → ESP32 button press → broadcasts to all browsers
//    WS   /        → Browser connects here to receive game events
//
//  Run:  node server.js
// ─────────────────────────────────────────────────────────────

const http       = require('http');
const { WebSocketServer, OPEN } = require('ws');
const os         = require('os');

const PORT = 3001;

// ── Discover local IP so user can configure the ESP32 ────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// ── HTTP server (handles ESP32 requests) ─────────────────────
const server = http.createServer((req, res) => {
  // Allow browser CORS preflight (in case frontend is on a different port)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── ESP32 heartbeat ──────────────────────────────────────
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  // ── ESP32 button pressed → broadcast shoot to all browsers ──
  if (req.method === 'POST' && req.url === '/shoot') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      console.log(`[${timestamp()}] 🔴 SHOOT received from ESP32 | body: ${body || '(empty)'}`);
      broadcast({ type: 'shoot', source: 'iot' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // ── Status page ─────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html><body style="font-family:monospace;background:#050a12;color:#4aedff;padding:40px">
        <h2>🕸 Web Shooter Bridge Server</h2>
        <p>Status: <b style="color:#00ffcc">ONLINE</b></p>
        <p>Browser WS clients connected: <b>${clients.size}</b></p>
        <p>ESP32 endpoint: <b>POST http://${getLocalIP()}:${PORT}/shoot</b></p>
        <hr>
        <p>Configure your ESP32 with:</p>
        <pre style="color:#ffaa00">
  const char* SERVER_IP = "${getLocalIP()}";
  const int   SERVER_PORT = ${PORT};
        </pre>
      </body></html>
    `);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ── WebSocket server (browser clients) ───────────────────────
const wss     = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const ip = req.socket.remoteAddress;
  console.log(`[${timestamp()}] 🌐 Browser connected (${ip}) | total clients: ${clients.size}`);

  // Send welcome + current status
  ws.send(JSON.stringify({ type: 'connected', message: 'Web Shooter bridge ready' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[${timestamp()}] 🌐 Browser disconnected | total clients: ${clients.size}`);
  });

  ws.on('error', err => {
    console.error(`[${timestamp()}] WS error:`, err.message);
    clients.delete(ws);
  });
});

// ── Broadcast to all connected browsers ──────────────────────
function broadcast(payload) {
  const data = JSON.stringify(payload);
  let sent = 0;
  clients.forEach(ws => {
    if (ws.readyState === OPEN) {
      ws.send(data);
      sent++;
    }
  });
  console.log(`[${timestamp()}] 📡 Broadcast "${payload.type}" → ${sent} client(s)`);
}

// ── Helpers ──────────────────────────────────────────────────
function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║       🕸  WEB SHOOTER BRIDGE SERVER  🕸          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  HTTP/WS   →  http://localhost:${PORT}             ║`);
  console.log(`║  Status    →  http://${localIP}:${PORT}          ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Copy this IP into your ESP32 sketch:            ║');
  console.log(`║  SERVER_IP = "${localIP}"               ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
});
