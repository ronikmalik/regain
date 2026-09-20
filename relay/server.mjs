// Relay: accepts Sensor Logger HTTP Push (POST /data) and rebroadcasts each
// Apple Watch "Wrist Motion" sample to browser clients over WebSocket.
// Zero dependencies — a minimal RFC 6455 server is inlined below.
//
// Sensor Logger setup (phone): Logger tab -> gear -> HTTP Push -> URL http://<this-pc-ip>:8787/data
// Enable the Apple Watch "Wrist Motion" sensor, start recording on the Watch.
// Payload format: https://github.com/tszheichoi/awesome-sensor-logger/blob/main/PUSHING.md
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const clients = new Set();
let count = 0;

// Sensor names Sensor Logger uses for the Watch (fallback to phone orientation if no watch data).
const WANTED = new Set(['wristmotion', 'watchmotion', 'orientation']);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'POST' && req.url.startsWith('/data')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        for (const s of msg.payload || []) {
          const name = String(s.name || '').toLowerCase().replace(/[^a-z]/g, '');
          if (!WANTED.has(name) && count === 0) console.log('seen sensor:', s.name, Object.keys(s).join(','));
          if (!WANTED.has(name)) continue;
          const v = s.values || s; // some versions nest values
          const out = { name: s.name, time: s.time };
          for (const k of ['quaternionW', 'quaternionX', 'quaternionY', 'quaternionZ', 'gravityX', 'gravityY', 'gravityZ', 'roll', 'pitch', 'yaw']) if (v[k] != null) out[k] = v[k];
          if (Object.keys(out).length > 2) broadcast(JSON.stringify(out));
        }
        count += 1;
        if (count % 20 === 1) console.log(`[relay] ${count} messages, ${clients.size} client(s)`);
      } catch (e) { console.error('bad payload', e.message); }
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Regain relay. POST Sensor Logger data to /data; browsers connect via WebSocket.');
});

// --- minimal WebSocket (server -> client text frames only) ---
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
  clients.add(socket);
  console.log(`[relay] browser connected (${clients.size})`);
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
  socket.on('data', (buf) => { if ((buf[0] & 0x0f) === 0x8) socket.end(); }); // close frame
});

function frame(text) {
  const data = Buffer.from(text);
  const len = data.length;
  let header;
  if (len < 126) header = Buffer.from([0x81, len]);
  else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([header, data]);
}
function broadcast(text) {
  const f = frame(text);
  for (const c of clients) c.write(f);
}

server.listen(PORT, () => console.log(`[relay] listening on http://0.0.0.0:${PORT}  (POST /data, WS same port)`));
