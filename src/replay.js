import { drawGauge } from './gauge.js';
import { RepDetector } from './reps.js';

// ---------- shared trace geometry ----------
function scale(ex, W, H, pad = 6) {
  const range = ex.neg ? Math.max(ex.normal.pos, ex.normal.neg) + 20 : ex.normal.pos + 20;
  const lo = ex.neg ? -range : 0;
  return { range, lo, y: (v) => pad + (H - 2 * pad) * (1 - (Math.max(lo, Math.min(range, v)) - lo) / (range - lo)) };
}
const fmtClock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

// Re-run the detector over a stored trace so rep bounds and hold windows are in trace time.
export function analyse(samples) {
  const det = new RepDetector();
  for (const [t, a] of samples) det.update(a, t);
  return det.reps;
}

// ---------- replay ----------
// Returns a card element that replays a saved set on the gauge with a scrubber and play button.
export function replayCard(record, ex) {
  const samples = record.samples || [];
  const el = document.createElement('div');
  el.className = 'card replay';
  if (samples.length < 20) { el.innerHTML = `<span class="eyebrow">Replay</span><p class="muted">No motion trace stored for this set.</p>`; return el; }
  const duration = samples.at(-1)[0];
  const reps = analyse(samples);
  const W = 320, H = 90;
  const { range, lo, y } = scale(ex, W, H);
  const x = (t) => (t / duration) * W;

  let trace = '';
  trace += `<rect class="band" x="0" y="${y(ex.normal.pos)}" width="${W}" height="${y(0) - y(ex.normal.pos)}"/>`;
  if (ex.neg) trace += `<rect class="band" x="0" y="${y(0)}" width="${W}" height="${y(-ex.normal.neg) - y(0)}"/>`;
  for (const r of reps) {
    trace += `<rect class="rep ${r.dir > 0 ? 'pos' : 'neg'}" x="${x(r.t0)}" y="0" width="${x(r.t1) - x(r.t0)}" height="${H}"/>`;
    if (r.holdFrom != null) trace += `<rect class="holdwin" x="${x(r.holdFrom)}" y="0" width="${Math.max(1, x(r.holdTo) - x(r.holdFrom))}" height="${H}"/>`;
  }
  trace += `<line class="zero" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>`;
  trace += `<polyline class="line" points="${samples.map(([t, a]) => `${x(t).toFixed(1)},${y(a).toFixed(1)}`).join(' ')}"/>`;
  trace += `<text x="4" y="${y(range) + 9}">${range}°</text><text x="4" y="${y(lo) - 2}">${lo}°</text>`;
  trace += `<line class="cursor" id="rp-cursor" x1="0" x2="0" y1="0" y2="${H}"/>`;

  el.innerHTML = `
    <div class="row" style="margin:0 0 4px"><span class="eyebrow" style="margin:0">Replay</span><span class="mono muted" id="rp-time">0:00 / ${fmtClock(duration)}</span></div>
    <svg class="gauge" id="rp-gauge" viewBox="0 0 300 170"></svg>
    <div class="readout"><div class="num" id="rp-num">0<sup>°</sup></div><div class="dir" id="rp-dir">Neutral</div></div>
    <svg class="trace full" id="rp-trace" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${trace}</svg>
    <div class="rp-controls">
      <button class="small primary" id="rp-play">Play</button>
      <input type="range" id="rp-scrub" min="0" max="${duration}" value="0" step="50" aria-label="Scrub">
      <div class="seg" id="rp-speed">${[1, 2, 4].map((s) => `<button aria-pressed="${s === 1}" data-v="${s}">${s}x</button>`).join('')}</div>
    </div>
    <div class="legend"><span><i class="sw pos"></i> ${ex.pos} rep</span>${ex.neg ? `<span><i class="sw neg"></i> ${ex.neg} rep</span>` : ''}<span><i class="sw good"></i> hold</span></div>`;

  const q = (id) => el.querySelector('#' + id);
  const gauge = q('rp-gauge'), num = q('rp-num'), dir = q('rp-dir'), cursor = q('rp-cursor'), scrub = q('rp-scrub'), time = q('rp-time'), play = q('rp-play');
  let t = 0, playing = false, speed = 1, raf = 0, last = 0, idx = 0;

  const angleAt = (ms) => {
    while (idx < samples.length - 1 && samples[idx + 1][0] <= ms) idx++;
    while (idx > 0 && samples[idx][0] > ms) idx--;
    return samples[idx][1];
  };
  const repAt = (ms) => reps.findIndex((r) => ms >= r.t0 && ms <= r.t1);
  const render = () => {
    const a = angleAt(t), ri = repAt(t), r = reps[ri];
    drawGauge(gauge, ex, Math.round(a));
    num.innerHTML = `${Math.abs(Math.round(a))}<sup>°</sup>`;
    const holding = r && r.holdFrom != null && t >= r.holdFrom && t <= r.holdTo;
    dir.textContent = holding ? `rep ${ri + 1} · holding` : ri >= 0 ? `rep ${ri + 1} · ${r.dir > 0 ? ex.pos : ex.neg}` : Math.abs(a) < 5 ? 'Neutral' : a > 0 ? ex.pos : ex.neg || '';
    dir.classList.toggle('hold', !!holding);
    cursor.setAttribute('x1', x(t)); cursor.setAttribute('x2', x(t));
    scrub.value = t;
    time.textContent = `${fmtClock(t)} / ${fmtClock(duration)}`;
  };
  const tick = (now) => {
    if (!playing) return;
    t = Math.min(duration, t + (now - last) * speed); last = now;
    render();
    if (t >= duration) { playing = false; play.textContent = 'Replay'; return; }
    raf = requestAnimationFrame(tick);
  };
  play.onclick = () => {
    if (playing) { playing = false; cancelAnimationFrame(raf); play.textContent = 'Play'; return; }
    if (t >= duration) t = 0;
    playing = true; play.textContent = 'Pause'; last = performance.now(); raf = requestAnimationFrame(tick);
  };
  scrub.oninput = () => { t = Number(scrub.value); render(); };
  q('rp-speed').querySelectorAll('button').forEach((b) => (b.onclick = () => { speed = Number(b.dataset.v); q('rp-speed').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  el.stop = () => { playing = false; cancelAnimationFrame(raf); };
  render();
  return el;
}

// ---------- overlay ----------
// Two traces on one time axis. a/b: {label, samples}. Returns an svg element.
export function overlayChart(ex, a, b) {
  const W = 520, H = 200, padL = 34, padR = 10, padT = 10, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const dur = Math.max(a.samples.at(-1)?.[0] || 1, b.samples.at(-1)?.[0] || 1);
  const { range, lo, y: yy } = scale(ex, ih, ih, 0);
  const y = (v) => padT + yy(v);
  const x = (t) => padL + (t / dur) * iw;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart compare');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${a.label} and ${b.label} traces overlaid`);
  let html = `<rect class="band" x="${padL}" y="${y(ex.normal.pos)}" width="${iw}" height="${y(0) - y(ex.normal.pos)}"/>`;
  if (ex.neg) html += `<rect class="band" x="${padL}" y="${y(0)}" width="${iw}" height="${y(-ex.normal.neg) - y(0)}"/>`;
  for (const v of ex.neg ? [-ex.normal.neg, 0, ex.normal.pos] : [0, ex.normal.pos]) {
    html += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}°</text>`;
  }
  const line = (s, cls) => `<polyline class="${cls}" points="${s.samples.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
  html += line(a, 'ov-a') + line(b, 'ov-b');
  for (const sec of [0, 15, 30, 45, 60, 90, 120]) if (sec * 1000 <= dur) html += `<text class="axis" x="${x(sec * 1000)}" y="${H - 6}" text-anchor="middle">${sec}s</text>`;
  svg.innerHTML = html;
  return svg;
}
