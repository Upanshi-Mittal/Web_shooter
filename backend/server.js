// ─────────────────────────────────────────────────────────────
//  Web Shooter — Bridge Server (V2 with CV & MPU6050 Support)
//  Connects:
//    1. ESP32 hardware device (Push button + MPU-6050 IMU)
//    2. OpenCV camera tracker (ArUco marker tracking)
//    3. Browser game frontend (React / Vite)
//
//  Endpoints:
//    POST /shoot   → ESP32 button press or flick gesture
//    POST /target  → OpenCV ArUco or IMU target coordinates (normalized 0..1)
//    POST /imu     → MPU-6050 tilt (pitch, roll) & acceleration data
//    GET  /ping    → Device heartbeat
//    WS   /        → Real-time event stream for browser clients
//
//  Run:  node server.js
// ─────────────────────────────────────────────────────────────

const http = require('http');
const { WebSocketServer, OPEN } = require('ws');
const os = require('os');

const PORT = 3001;

// ── Connection state tracking ────────────────────────────────
let cvLastSeen  = 0;
let iotLastSeen = 0;
let imuLastSeen = 0;

function isCVActive()  { return Date.now() - cvLastSeen < 2500; }
function isIoTActive() { return Date.now() - iotLastSeen < 3500; }
function isIMUActive() { return Date.now() - imuLastSeen < 3500; }

function getStatusPayload() {
  return {
    type: 'status',
    cv: isCVActive(),
    iot: isIoTActive(),
    imu: isIMUActive(),
  };
}

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

// ── HTTP server ──────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── ESP32 / CV heartbeat ───────────────────────────────────
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, server: 'web-shooter-bridge' }));
    return;
  }

  // ── Shoot trigger (from ESP32 push button or flick gesture) ──
  if (req.method === 'POST' && req.url === '/shoot') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      iotLastSeen = Date.now();
      let payload = { type: 'shoot', source: 'iot' };
      try {
        if (body) {
          const parsed = JSON.parse(body);
          payload.source = parsed.source || 'iot';
        }
      } catch (_) {}

      console.log(`[${timestamp()}] 🔴 SHOOT received (${payload.source})`);
      broadcast(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // ── Target coordinate update (from OpenCV or IMU tilt) ──────
  if (req.method === 'POST' && req.url === '/target') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const source = data.source || 'cv';
        if (source === 'cv') cvLastSeen = Date.now();
        if (source === 'imu') imuLastSeen = Date.now();

        broadcast({
          type: 'target',
          x: data.x, // normalized 0..1
          y: data.y, // normalized 0..1
          source,
          markerId: data.markerId,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── MPU-6050 IMU Data (from ESP32) ──────────────────────────
  if (req.method === 'POST' && req.url === '/imu') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        iotLastSeen = Date.now();
        imuLastSeen = Date.now();

        // If flick gesture detected
        if (data.flick) {
          console.log(`[${timestamp()}] ⚡ FLICK gesture detected from MPU-6050!`);
          broadcast({ type: 'shoot', source: 'gesture' });
        }

        // Broadcast IMU orientation
        broadcast({
          type: 'imu',
          pitch: data.pitch,
          roll: data.roll,
          yaw: data.yaw,
          ax: data.ax,
          ay: data.ay,
          az: data.az,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── Status page ─────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/') {
    const localIP = getLocalIP();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Web Shooter Bridge</title>
        <style>
          body { font-family: monospace; background: #050a12; color: #4aedff; padding: 40px; }
          .card { border: 1px solid #1a3045; background: #08121f; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
          .online { color: #00ffcc; font-weight: bold; }
          .offline { color: #ff5555; }
          pre { background: #020509; padding: 12px; border-radius: 4px; color: #ffaa00; }
        </style>
      </head>
      <body>
        <h2>🕸 Web Shooter Bridge Server (V2)</h2>
        <div class="card">
          <p>Bridge Status: <span class="online">ONLINE</span></p>
          <p>Web Browser Clients: <b>${clients.size}</b></p>
          <p>CV Camera Tracking: <span class="${isCVActive() ? 'online' : 'offline'}">${isCVActive() ? 'ACTIVE' : 'OFFLINE'}</span></p>
          <p>ESP32 Device: <span class="${isIoTActive() ? 'online' : 'offline'}">${isIoTActive() ? 'CONNECTED' : 'OFFLINE'}</span></p>
          <p>MPU-6050 IMU: <span class="${isIMUActive() ? 'online' : 'offline'}">${isIMUActive() ? 'ACTIVE' : 'OFFLINE'}</span></p>
        </div>
        <div class="card">
          <h3>ESP32 Configuration</h3>
          <pre>
const char* SERVER_IP   = "${localIP}";
const int   SERVER_PORT = ${PORT};</pre>
          <h3>OpenCV Target Endpoint</h3>
          <pre>POST http://${localIP}:${PORT}/target  {"x": 0.5, "y": 0.5, "source": "cv"}</pre>
        </div>
      </body>
      </html>
    `);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ── WebSocket server ─────────────────────────────────────────
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const ip = req.socket.remoteAddress;
  console.log(`[${timestamp()}] 🌐 Client connected (${ip}) | total: ${clients.size}`);

  // Send initial status
  ws.send(JSON.stringify({ type: 'connected', message: 'Bridge connected' }));
  ws.send(JSON.stringify(getStatusPayload()));

  // Allow WebSocket clients (like Python or ESP32 WS) to send events directly
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'target') {
        if (data.source === 'cv') cvLastSeen = Date.now();
        if (data.source === 'imu') imuLastSeen = Date.now();
        broadcast(data, ws);
      } else if (data.type === 'shoot') {
        iotLastSeen = Date.now();
        console.log(`[${timestamp()}] 🔴 SHOOT from WS client`);
        broadcast(data);
      } else if (data.type === 'imu') {
        iotLastSeen = Date.now();
        imuLastSeen = Date.now();
        broadcast(data, ws);
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[${timestamp()}] 🌐 Client disconnected | remaining: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error(`[${timestamp()}] WS error:`, err.message);
    clients.delete(ws);
  });
});

// Broadcast status heartbeat every 1.5s
setInterval(() => {
  if (clients.size > 0) {
    broadcast(getStatusPayload());
  }
}, 1500);

// ── Broadcast to all browsers ────────────────────────────────
function broadcast(payload, senderWs = null) {
  const data = JSON.stringify(payload);
  clients.forEach(ws => {
    if (ws !== senderWs && ws.readyState === OPEN) {
      ws.send(data);
    }
  });
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   🕸  WEB SHOOTER BRIDGE SERVER (CV + MPU6050)   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  HTTP/WS   →  http://localhost:${PORT}             ║`);
  console.log(`║  Status    →  http://${localIP}:${PORT}          ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  ESP32 Config:                                   ║');
  console.log(`║  SERVER_IP = "${localIP}"               ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
});
