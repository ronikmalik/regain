// Single-series bar chart of max ROM per session with a dashed target line.
// sessions: [{ts, value}], target: degrees. Returns an <svg> element with hover/tap tooltips.
export function romChart({ sessions, target, label, unit = '°' }) {
  const W = 520, H = 200, padL = 34, padR = 12, padT = 18, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxV = Math.max(target, ...sessions.map((s) => s.value), 10) * 1.1;
  const y = (v) => padT + ih - (v / maxV) * ih;
  const n = sessions.length;
  const slot = iw / Math.max(n, 8);
  const bw = Math.min(28, slot * 0.6);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${label}: max range of motion per session, target ${target} degrees`);

  let html = '';
  const ticks = niceTicks(maxV);
  for (const t of ticks) {
    html += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/>`;
    html += `<text class="axis" x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${t}${unit}</text>`;
  }
  html += `<line class="target" x1="${padL}" x2="${W - padR}" y1="${y(target)}" y2="${y(target)}"/>`;
  html += `<text class="axis" x="${W - padR}" y="${y(target) - 4}" text-anchor="end">${unit === "°" ? "normal" : "goal"} ${target}${unit}</text>`;

  sessions.forEach((s, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const top = y(s.value), h = Math.max(0, padT + ih - top);
    const r = Math.min(4, h);
    // rounded top, flat baseline
    const d = `M${x},${padT + ih} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
    html += `<path class="bar" d="${d}" data-i="${i}"/>`;
    html += `<rect x="${padL + slot * i}" y="${padT}" width="${slot}" height="${ih}" fill="transparent" data-i="${i}" class="hit"/>`;
    if (i === n - 1) html += `<text class="lbl" x="${x + bw / 2}" y="${top - 6}" text-anchor="middle">${s.value}${unit}</text>`;
    if (i === 0 || i === n - 1 || n <= 6) {
      html += `<text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${fmtDate(s.ts)}</text>`;
    }
  });
  html += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${padT + ih}" y2="${padT + ih}"/>`;
  svg.innerHTML = html;

  // tooltip
  let tip = null;
  const show = (e) => {
    const i = e.target.dataset.i; if (i == null) return;
    const s = sessions[i];
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    tip.textContent = `${fmtDate(s.ts)} · ${s.value}${unit} · ${s.reps} reps` + (s.pain != null ? ` · pain ${s.pain}/10` : '');
    const p = e.touches ? e.touches[0] : e;
    tip.style.left = p.clientX + 'px'; tip.style.top = p.clientY + 'px';
  };
  const hide = () => { tip?.remove(); tip = null; };
  svg.addEventListener('mousemove', show);
  svg.addEventListener('mouseleave', hide);
  svg.addEventListener('touchstart', show, { passive: true });
  svg.addEventListener('touchend', hide);
  return svg;
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
