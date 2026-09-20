// Cross-set insights: weekly summary, adherence calendar, pain vs range.
// All inputs are saved session records; all outputs are plain data or SVG strings.

const DAY = 864e5;
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtDelta = (v, unit = '°', dp = 0) => `${v >= 0 ? '+' : ''}${v.toFixed(dp)}${unit}`;

// ---------- weekly summary ----------
export function weeklySummary(sessions, byId) {
  const now = Date.now(), wk = 7 * DAY;
  const thisWeek = sessions.filter((s) => now - s.ts < wk);
  const prevWeek = sessions.filter((s) => now - s.ts >= wk && now - s.ts < 2 * wk);
  const days = new Set(thisWeek.map((s) => dayKey(s.ts))).size;
  const best = (list, id, key) => Math.max(0, ...list.filter((s) => s.exerciseId === id).map((s) => s[key]));
  const ids = [...new Set(thisWeek.map((s) => s.exerciseId))];
  const gains = ids.map((id) => {
    const ex = byId(id);
    const cur = best(thisWeek, id, 'maxPos'), prev = best(prevWeek, id, 'maxPos');
    return { id, name: `${ex.joint} ${ex.pos.toLowerCase()}`, cur, prev, delta: prev ? cur - prev : null, pct: Math.round((cur / ex.normal.pos) * 100) };
  });
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgHold = mean(thisWeek.map((s) => s.avgHold).filter((v) => v != null));
  const smooth = mean(thisWeek.map((s) => s.metrics?.smooth).filter((v) => v != null));
  const smoothPrev = mean(prevWeek.map((s) => s.metrics?.smooth).filter((v) => v != null));
  const pain = mean(thisWeek.map((s) => s.pain).filter((v) => v != null));
  const painPrev = mean(prevWeek.map((s) => s.pain).filter((v) => v != null));

  // one sentence of guidance
  let note;
  const up = gains.filter((g) => g.delta != null && g.delta >= 3), down = gains.filter((g) => g.delta != null && g.delta <= -3);
  const painUp = pain != null && painPrev != null && pain - painPrev >= 2;
  if (!thisWeek.length) note = 'No sets in the last 7 days. One short set today restarts the trend.';
  else if (painUp && !up.length) note = 'Pain rose this week while range stayed flat. Ease the dose and tell your therapist.';
  else if (painUp) note = `Range is up (${up.map((g) => `${g.name} ${fmtDelta(g.delta)}`).join(', ')}) but so is pain. Hold the dose steady rather than pushing further.`;
  else if (days < 3) note = `${thisWeek.length} set${thisWeek.length === 1 ? '' : 's'} on ${days} day${days === 1 ? '' : 's'}. Three or more days a week is where range gains show up.`;
  else if (up.length) note = `Range is up on ${up.map((g) => `${g.name} (${fmtDelta(g.delta)})`).join(', ')}. Keep the same dose.`;
  else if (down.length) note = `${down.map((g) => g.name).join(', ')} dipped this week. A dip after a hard week is normal; if it lasts two weeks, mention it to your therapist.`;
  else note = 'Steady week. Consistency now, gains later.';

  return { sets: thisWeek.length, setsPrev: prevWeek.length, days, gains, avgHold, smooth, smoothPrev, pain, painPrev, note };
}

// ---------- adherence calendar ----------
// 12-week heatmap, Monday to Sunday rows, one column per week, newest on the right.
export function calendarSvg(sessions, weeks = 12) {
  const counts = {};
  for (const s of sessions) counts[dayKey(s.ts)] = (counts[dayKey(s.ts)] || 0) + 1;
  const today = startOfDay(Date.now());
  const dow = (new Date(today).getDay() + 6) % 7; // Monday = 0
  const first = today - (weeks * 7 - 1 - (6 - dow)) * DAY; // Monday of the first week shown
  const cell = 14, gap = 3, padL = 26, padT = 18;
  const W = padL + weeks * (cell + gap), H = padT + 7 * (cell + gap);
  let html = '';
  const months = new Set();
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const ts = first + (w * 7 + d) * DAY;
      if (ts > today) continue;
      const n = counts[dayKey(ts)] || 0;
      const x = padL + w * (cell + gap), y = padT + d * (cell + gap);
      const date = new Date(ts);
      if (date.getDate() <= 7 && !months.has(date.getMonth())) { months.add(date.getMonth()); html += `<text class="axis" x="${x}" y="${padT - 6}">${date.toLocaleDateString([], { month: 'short' })}</text>`; }
      html += `<rect class="day n${Math.min(n, 3)}${ts === today ? ' today' : ''}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3"><title>${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}: ${n} set${n === 1 ? '' : 's'}</title></rect>`;
    }
  }
  for (const [i, l] of [[0, 'M'], [2, 'W'], [4, 'F'], [6, 'S']]) html += `<text class="axis" x="${padL - 8}" y="${padT + i * (cell + gap) + cell - 3}" text-anchor="end">${l}</text>`;
  return `<svg class="cal" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sets per day over the last ${weeks} weeks">${html}</svg>`;
}

export function streakInfo(sessions) {
  const days = new Set(sessions.map((s) => dayKey(s.ts)));
  let streak = 0;
  for (let d = new Date(); days.has(dayKey(d.getTime())); d.setDate(d.getDate() - 1)) streak++;
  const last28 = new Set(sessions.filter((s) => Date.now() - s.ts < 28 * DAY).map((s) => dayKey(s.ts))).size;
  return { streak, activeDays28: last28 };
}

// ---------- pain vs range ----------
export function painInsight(sets, ex) {
  const pts = sets.filter((s) => s.pain != null).map((s) => ({ pain: s.pain, range: s.maxPos, ts: s.ts }));
  if (pts.length < 3) return { pts, note: null, r: null };
  const mx = pts.reduce((a, p) => a + p.pain, 0) / pts.length, my = pts.reduce((a, p) => a + p.range, 0) / pts.length;
  let num = 0, dx = 0, dy = 0;
  for (const p of pts) { num += (p.pain - mx) * (p.range - my); dx += (p.pain - mx) ** 2; dy += (p.range - my) ** 2; }
  const r = dx && dy ? num / Math.sqrt(dx * dy) : 0;
  const recent = pts.slice(-3), early = pts.slice(0, 3);
  const mean = (xs, k) => xs.reduce((a, p) => a + p[k], 0) / xs.length;
  const dPain = mean(recent, 'pain') - mean(early, 'pain'), dRange = mean(recent, 'range') - mean(early, 'range');
  const last = pts.at(-1), prev = pts.at(-2);
  let note;
  if (last.pain - prev.pain >= 3) note = `Pain jumped to ${last.pain} on the latest set. If it stays there, ease off and tell your therapist.`;
  else if (dRange >= 5 && dPain <= -1) note = `Range is up ${fmtDelta(dRange)} while pain is down ${fmtDelta(-dPain, '', 1)} points since your first sets. That is the pattern you want.`;
  else if (dRange >= 5 && dPain >= 1) note = `Range is up ${fmtDelta(dRange)} but pain is also up ${fmtDelta(dPain, '', 1)} points. Progress with a cost; keep the dose steady.`;
  else if (r <= -0.5) note = `Higher-pain days tend to be lower-range days for this exercise. Warm-up and pacing matter more than pushing.`;
  else note = `No clear link between pain and range yet. Keep logging pain after each set.`;
  return { pts, r: Math.round(r * 100) / 100, note };
}

export function painScatterSvg(pts, ex) {
  const W = 520, H = 180, padL = 34, padR = 12, padT = 12, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxV = Math.max(ex.normal.pos, ...pts.map((p) => p.range)) * 1.1;
  const x = (p) => padL + (p / 10) * iw, y = (v) => padT + ih - (v / maxV) * ih;
  let html = `<rect class="band" x="${padL}" y="${y(maxV)}" width="${iw}" height="${y(ex.normal.pos * 0.9) - y(maxV)}"/>`;
  for (let p = 0; p <= 10; p += 2) html += `<text class="axis" x="${x(p)}" y="${H - 6}" text-anchor="middle">${p}</text>`;
  for (const v of [0, Math.round(ex.normal.pos / 2), ex.normal.pos]) html += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}°</text>`;
  const n = pts.length;
  pts.forEach((p, i) => {
    const recent = i >= n - 3;
    html += `<circle class="pt${recent ? ' recent' : ''}" cx="${x(p.pain) + (Math.random() - 0.5) * 6}" cy="${y(p.range)}" r="${recent ? 6 : 5}"><title>${new Date(p.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}: pain ${p.pain}, ${p.range}°</title></circle>`;
  });
  html += `<text class="axis" x="${W - padR}" y="${padT + 10}" text-anchor="end">pain 0 to 10 across, best range up</text>`;
  return `<svg class="chart scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pain versus best range per set">${html}</svg>`;
}
