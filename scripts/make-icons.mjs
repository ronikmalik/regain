// Generates public/icons/*.png (PWA + apple-touch-icon) with a tiny built-in rasterizer.
// No image libraries: draws the Regain mark (gauge arc + needle dot) and encodes PNG with zlib.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [11, 18, 32], RING = [34, 211, 238], DOT = [230, 237, 243], TRACK = [26, 37, 50];

function render(size) {
  const ss = 3, S = size * ss; // supersample
  const px = new Float32Array(S * S * 3);
  const put = (i, c, a) => { px[i] += (c[0] - px[i]) * a; px[i + 1] += (c[1] - px[i + 1]) * a; px[i + 2] += (c[2] - px[i + 2]) * a; };
  const cx = S / 2, cy = S * 0.56, R = S * 0.30, w = S * 0.085, rad = S * 0.22;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 3;
    // rounded-square background
    const dx = Math.max(Math.abs(x - S / 2) - (S / 2 - rad), 0), dy = Math.max(Math.abs(y - S / 2) - (S / 2 - rad), 0);
    if (Math.hypot(dx, dy) > rad) { px[i] = px[i + 1] = px[i + 2] = 0; continue; }
    put(i, BG, 1);
    // gauge track: semicircle from 200° to -20° (open at the bottom)
    const d = Math.hypot(x - cx, y - cy), ang = Math.atan2(cy - y, x - cx); // ang: 0 = right, pi/2 = up
    const onRing = Math.abs(d - R) < w / 2;
    if (onRing && ang > -0.35 && ang < Math.PI + 0.35) {
      put(i, TRACK, 1);
      if (ang > 0.75) put(i, RING, 1); // lit sweep from the left up over the top to ~43° right of top
    }
  }
  // needle dot at the end of the sweep + centre pivot
  const dot = (ax, ay, r, c) => { for (let y = Math.floor(ay - r); y <= ay + r; y++) for (let x = Math.floor(ax - r); x <= ax + r; x++) { if (x < 0 || y < 0 || x >= S || y >= S) continue; const dd = Math.hypot(x - ax, y - ay); if (dd < r) put((y * S + x) * 3, c, Math.min(1, r - dd)); } };
  dot(cx + R * Math.cos(0.75), cy - R * Math.sin(0.75), w * 0.9, DOT);
  dot(cx, cy, w * 0.55, RING);
  // downsample
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const X = x * ss + sx, Y = y * ss + sy, i = (Y * S + X) * 3;
      const dx = Math.max(Math.abs(X - S / 2) - (S / 2 - rad), 0), dy = Math.max(Math.abs(Y - S / 2) - (S / 2 - rad), 0);
      const inside = Math.hypot(dx, dy) <= rad;
      if (inside) { r += px[i]; g += px[i + 1]; b += px[i + 2]; a += 1; }
    }
    const o = (y * size + x) * 4, n = ss * ss;
    out[o] = a ? r / a : 0; out[o + 1] = a ? g / a : 0; out[o + 2] = a ? b / a : 0; out[o + 3] = (a / n) * 255;
  }
  return out;
}

function png(size, rgba) {
  const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size, render(size)));
  console.log(`icon-${size}.png`);
}
