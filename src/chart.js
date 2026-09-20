import { rollingMedian, projection, milestones } from './metrics.js';

// Recovery timeline: best-per-set bars, 7-day rolling median line, target band, milestone markers,
// and a projected date to reach the target. Tap a bar to open that set.
// points: [{ts, value, reps, pain, id}]  target: number  unit: '°' | 's'
export function timelineChart({ points, target, label, unit = '°', onSelect, band = true, project = true, miles = true }) {
  const W = 520, H = 220, padL = 34, padR = 14, padT = 30, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const proj = project ? projection(points, target) : null;
  const t0 = points[0].ts, tEnd = Math.max(points.at(-1).ts, proj?.etaTs ?? 0);
  const span = Math.max(tEnd - t0, 864e5);
  const maxV = Math.max(target * 1.15, ...points.map((p) => p.value * 1.1), 10);
  const x = (ts) => padL + ((ts - t0) / span) * iw;
  const y = (v) => padT + ih - (v / maxV) * ih;
  const n = points.length;
  const bw = Math.max(6, Math.min(22, (iw / Math.max(n, 6)) * 0.55));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart timeline');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${label} per set with target ${target}${unit}`);

  let html = '';
  // target band (90 % of target and above)
  if (band) html += `<rect class="band" x="${padL}" y="${y(maxV)}" width="${iw}" height="${y(target * 0.9) - y(maxV)}"/>`;
  for (const t of niceTicks(maxV)) {
    html += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/>`;
    html += `<text class="axis" x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${t}${unit}</text>`;
  }
  html += `<line class="target" x1="${padL}" x2="${W - padR}" y1="${y(target)}" y2="${y(target)}"/>`;
  html += `<text class="axis" x="${padL + 4}" y="${y(target) - 4}">${unit === '°' ? 'normal' : 'goal'} ${target}${unit}</text>`;

  // bars
  points.forEach((p, i) => {
    const cx = x(p.ts), top = y(p.value), h = Math.max(0, padT + ih - top), r = Math.min(4, h);
    const bx = cx - bw / 2;
    html += `<path class="bar" d="M${bx},${padT + ih} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z" data-i="${i}"/>`;
    html += `<rect class="hit" x="${bx - 6}" y="${padT}" width="${bw + 12}" height="${ih}" fill="transparent" data-i="${i}"/>`;
  });
  // rolling median line
  if (n >= 2) {
    const med = rollingMedian(points);
    html += `<polyline class="median" points="${points.map((p, i) => `${x(p.ts).toFixed(1)},${y(med[i]).toFixed(1)}`).join(' ')}"/>`;
  }
  // milestones
  for (const m of miles ? milestones(points, target) : []) {
    const p = points[m.i], cx = x(p.ts);
    html += `<line class="mile" x1="${cx}" x2="${cx}" y1="${padT - 2}" y2="${y(p.value) - 4}"/><text class="mile-lbl" x="${cx}" y="${padT - 6}" text-anchor="middle">${Math.round(m.frac * 100)}%</text>`;
  }
  // projection
  if (proj?.etaTs) {
    const last = points.at(-1);
    html += `<line class="proj" x1="${x(last.ts)}" y1="${y(last.value)}" x2="${x(proj.etaTs)}" y2="${y(target)}"/>`;
    html += `<circle class="proj-dot" cx="${x(proj.etaTs)}" cy="${y(target)}" r="5"/>`;
    html += `<text class="axis" x="${x(proj.etaTs)}" y="${H - 8}" text-anchor="end">${fmtDate(proj.etaTs)}</text>`;
  }
  html += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${padT + ih}" y2="${padT + ih}"/>`;
  html += `<text class="axis" x="${x(points[0].ts)}" y="${H - 8}" text-anchor="start">${fmtDate(points[0].ts)}</text>`;
  if (!proj?.etaTs) html += `<text class="axis" x="${x(points.at(-1).ts)}" y="${H - 8}" text-anchor="end">${fmtDate(points.at(-1).ts)}</text>`;
  svg.innerHTML = html;

  // hover tooltip + tap to open
  let tip = null;
  const show = (e) => {
    const i = e.target.dataset.i; if (i == null) return;
    const p = points[i];
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    tip.textContent = `${fmtDate(p.ts)} · ${p.value}${unit} · ${p.reps} reps` + (p.pain != null ? ` · pain ${p.pain}` : '') + (onSelect ? ' · tap to open' : '');
    const c = e.touches ? e.touches[0] : e;
    tip.style.left = c.clientX + 'px'; tip.style.top = c.clientY + 'px';
  };
  const hide = () => { tip?.remove(); tip = null; };
  svg.addEventListener('mousemove', show);
  svg.addEventListener('mouseleave', hide);
  svg.addEventListener('touchstart', show, { passive: true });
  svg.addEventListener('touchend', hide);
  if (onSelect) svg.addEventListener('click', (e) => { const i = e.target.dataset.i; if (i != null) onSelect(points[i], Number(i)); });
  return { svg, proj };
}

// One sentence about the projection, or null.
export function projectionText(proj, target, unit = '°', label = '') {
  if (!proj) return null;
  if (proj.reached) return `${label ? label + ' is' : 'You are'} at or above the target of ${target}${unit}. Keep it there.`;
  if (!proj.etaTs) return `Recent sets are flat. Gains usually follow consistency, so keep the sets coming.`;
  const days = Math.round((proj.etaTs - Date.now()) / 864e5);
  if (days <= 0) return `Your trend has reached the target. One more set will confirm it.`;
  const when = days < 14 ? `about ${days} days` : days < 60 ? `about ${Math.round(days / 7)} weeks` : `about ${Math.round(days / 30)} months`;
  return `At the current pace (+${proj.slopePerDay.toFixed(1)}${unit} per day), you reach ${target}${unit} in ${when} (${fmtDate(proj.etaTs)}).`;
}

function niceTicks(max) {
  const step = max > 120 ? 50 : max > 60 ? 25 : max > 12 ? 10 : max > 6 ? 2 : 1;
  const out = [];
  for (let t = 0; t <= max; t += step) out.push(t);
  return out;
}

function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
