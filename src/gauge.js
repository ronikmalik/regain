// Semicircular gauge: neutral at the top, positive direction to the right.
export function drawGauge(svg, ex, angle) {
  const cx = 150, cy = 148, r = 106;
  const range = ex.neg ? Math.max(ex.normal.pos, ex.normal.neg) + 20 : ex.normal.pos + 20; // degrees per half-sweep
  const lo = ex.neg ? -range : 0;
  const toA = (deg) => (ex.neg ? deg / range : (deg / range) * 2 - 1) * (Math.PI / 2);
  const toXY = (deg, rad = r) => { const a = toA(deg); return [cx + rad * Math.sin(a), cy - rad * Math.cos(a)]; };
  const arc = (from, to, stroke, w = 14) => {
    const [x1, y1] = toXY(from), [x2, y2] = toXY(to);
    const large = Math.abs(to - from) / range > 1 ? 1 : 0;
    const sweep = to > from ? 1 : 0;
    return `<path d="M${x1},${y1} A${r},${r} 0 ${large} ${sweep} ${x2},${y2}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const clamp = (v) => Math.max(lo, Math.min(range, v));
  let html = arc(lo, range, 'var(--surface-3)');
  // minor ticks every 10°, major every 30°
  const step = 10;
  for (let d = Math.ceil(lo / step) * step; d <= range; d += step) {
    const major = d % 30 === 0;
    const [x1, y1] = toXY(d, r + 12), [x2, y2] = toXY(d, r + (major ? 20 : 16));
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${major ? 'var(--text-3)' : 'var(--border-2)'}" stroke-width="1.5"/>`;
    if (major && d !== 0) { const [tx, ty] = toXY(d, r + 30); html += `<text x="${tx}" y="${ty + 3}" text-anchor="middle" font-size="9" font-family="var(--mono)" fill="var(--text-3)">${Math.abs(d)}</text>`; }
  }
  // target bands
  const band = (from, to) => arc(from, to, 'var(--accent-soft)', 14);
  html += band(0, ex.normal.pos);
  if (ex.neg) html += band(-ex.normal.neg, 0);
  const a = clamp(angle);
  if (Math.abs(a) > 0.5) html += arc(0, a, 'var(--accent)', 14);
  const tgt = (deg) => { const [x1, y1] = toXY(deg, r - 12), [x2, y2] = toXY(deg, r + 8); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--good)" stroke-width="2.5" stroke-linecap="round"/>`; };
  html += tgt(ex.normal.pos);
  if (ex.neg) html += tgt(-ex.normal.neg);
  const [nx, ny] = toXY(a);
  html += `<circle cx="${nx}" cy="${ny}" r="13" fill="var(--accent)" opacity="0.25"/><circle cx="${nx}" cy="${ny}" r="8" fill="#fff"/>`;
  // zero marker
  const [zx, zy] = toXY(0, r + 24);
  html += `<text x="${zx}" y="${zy}" text-anchor="middle" font-size="9" font-family="var(--mono)" fill="var(--text-3)">0</text>`;
  svg.innerHTML = html;
}

