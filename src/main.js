import { EXERCISES, GRIP, byId } from './exercises.js';
import { PhoneSource, SimSource, WatchSource } from './motion.js';
import { relative, twistDeg } from './quat.js';
import { RepDetector } from './reps.js';
import { loadSessions, saveSession, clearSessions, loadSettings, saveSettings, exportCsv } from './store.js';
import { romChart } from './chart.js';
import { figure } from './figures.js';

const app = document.getElementById('app');
const THUMB = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
  <path d="M14 40c-2-5-3-9-3-14a13 13 0 0 1 26 0c0 5-1 9-2 13"/>
  <path d="M19 41c-1.5-5-2.5-10-2.5-15a7.5 7.5 0 0 1 15 0c0 5-1 10-2.5 15"/>
  <path d="M24 42V26"/>
  <path d="M8 22a16 16 0 0 1 32 0"/>
</svg>`;
const params = new URLSearchParams(location.search);
const settings = loadSettings();
if (params.has('sim')) settings.source = 'sim';
settings.source ||= 'phone';

let session = null; // active session state

// ---------- routing ----------
const screens = { home, setup, live, summary, progress };
function go(name, arg) { window.scrollTo(0, 0); app.classList.remove('live'); screens[name](arg); }

// ---------- home ----------
function home() {
  const grouped = {};
  for (const e of EXERCISES) (grouped[e.joint] ||= []).push(e);
  const sessions = loadSessions();
  app.innerHTML = `
    <div class="topbar"><h1>Regain</h1><button class="small" id="progress">Progress${sessions.length ? ` (${sessions.length})` : ''}</button></div>
    <p class="muted">Hold your phone like you normally would — it measures your joint angles, counts reps and tracks recovery. Not medical advice; follow your therapist's plan.</p>
    <div class="row">
      <span class="eyebrow">Injured side</span>
      <div class="seg" id="hand">
        <button aria-pressed="${settings.hand === 'left'}" data-v="left">Left</button>
        <button aria-pressed="${settings.hand === 'right'}" data-v="right">Right</button>
      </div>
    </div>
    <div class="row">
      <span class="eyebrow">Sensor</span>
      <div class="seg" id="source">
        <button aria-pressed="${settings.source === 'phone'}" data-v="phone">Phone</button>
        <button aria-pressed="${settings.source === 'watch'}" data-v="watch">Watch</button>
        <button aria-pressed="${settings.source === 'sim'}" data-v="sim">Sim</button>
      </div>
    </div>
    <div class="row">
      <span class="eyebrow">Voice coach</span>
      <div class="seg" id="voice">
        <button aria-pressed="${settings.voice !== false}" data-v="on">On</button>
        <button aria-pressed="${settings.voice === false}" data-v="off">Off</button>
      </div>
    </div>
    ${settings.source === 'watch' ? `<div class="card"><span class="eyebrow">Relay URL</span><input id="relay" type="url" value="${settings.relayUrl || 'ws://localhost:8787'}" style="width:100%;margin-top:6px;font:inherit;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"><p class="muted">Apple Watch data arrives via the Sensor Logger app → <code>npm run relay</code>. See README.</p></div>` : ''}
    ${Object.entries(grouped).map(([joint, list]) => `
      <h2>${joint}</h2>
      ${list.map((e) => `<div class="card tap" data-id="${e.id}"><div class="body"><div class="title">${e.name}</div><div class="sub">${lastFor(sessions, e)}</div></div><span class="chev">›</span></div>`).join('')}
    `).join('')}
  `;
  app.querySelector('#progress').onclick = () => go('progress');
  segment(app.querySelector('#hand'), (v) => { settings.hand = v; saveSettings(settings); });
  segment(app.querySelector('#source'), (v) => { settings.source = v; saveSettings(settings); home(); });
  segment(app.querySelector('#voice'), (v) => { settings.voice = v === 'on'; saveSettings(settings); });
  app.querySelector('#relay')?.addEventListener('change', (e) => { settings.relayUrl = e.target.value; saveSettings(settings); });
  app.querySelectorAll('.card.tap').forEach((c) => (c.onclick = () => go('setup', byId(c.dataset.id))));
}

function segment(el, onChange) {
  el.querySelectorAll('button').forEach((b) => (b.onclick = () => {
    el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    onChange(b.dataset.v);
  }));
}

function lastFor(sessions, ex) {
  const s = sessions.filter((x) => x.exerciseId === ex.id).at(-1);
  if (!s) return 'Not started';
  const parts = [`${ex.pos} ${s.maxPos}°`];
  if (ex.neg) parts.push(`${ex.neg} ${s.maxNeg}°`);
  return `Last: ${parts.join(' · ')} · ${new Date(s.ts).toLocaleDateString()}`;
}

// ---------- setup ----------
function setup(ex) {
  app.innerHTML = `
    <div class="topbar"><button class="small ghost" id="back">‹ Back</button><h1>${ex.joint}: ${ex.name}</h1></div>
    <div class="card figwrap">
      ${figure(ex.id, settings.hand)}
      <div class="legend"><span><i class="sw screen"></i> screen side of phone</span><span><i class="sw pos"></i> ${ex.pos}</span>${ex.neg ? `<span><i class="sw neg"></i> ${ex.neg}</span>` : ''}<span class="muted">${settings.hand} hand</span></div>
    </div>
    <div class="card grip">
      <div class="step"><span class="n">1</span><div><span class="eyebrow">Grip</span><p>${GRIP}</p></div></div>
      <div class="step"><span class="n">2</span><div><span class="eyebrow">Starting position</span><p>${ex.arm}</p></div></div>
      <div class="step"><span class="n">3</span><div><span class="eyebrow">Movement</span><p>${ex.cue}</p></div></div>
    </div>
    <p class="muted">Healthy range: ${ex.pos} ${ex.normal.pos}°${ex.neg ? `, ${ex.neg} ${ex.normal.neg}°` : ''}. Move slowly and stop if you feel sharp pain.</p>
    <p class="muted">Tap Start with your other hand, then rest your thumb on the pad that appears. The 3-second countdown begins once your thumb is on it, and the set only counts while it stays there${settings.voice !== false ? ' — the voice coach will call out your reps so you don\'t need to watch the screen' : ''}.</p>
    <div id="err"></div>
    <button class="primary block" id="start">Start</button>
  `;
  app.querySelector('#back').onclick = () => go('home');
  app.querySelector('#start').onclick = async () => {
    const btn = app.querySelector('#start');
    btn.disabled = true; btn.textContent = 'Starting sensors…';
    try { if (settings.voice !== false) speechSynthesis?.speak(new SpeechSynthesisUtterance('')); } catch {} // iOS: unlock speech inside the tap
    try {
      await startSession(ex);
      go('live');
      waitForThumb();
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Start';
      app.querySelector('#err').innerHTML = `<div class="card error">${e.message}</div>`;
    }
  };
}

// Hold-still countdown, then the current pose becomes neutral. Also used by Recalibrate.
function calibrate(seconds) {
  if (!session) return;
  clearTimeout(session.calTimer);
  session.q0 = null; session.smooth = 0; session.det = new RepDetector();
  if (!session.held) { waitForThumb(); return; }
  session.state = 'cal';
  let n = seconds;
  const tick = () => {
    if (!session || !liveEls || session.state !== 'cal') return;
    if (n > 0) {
      liveEls.overlay.hidden = false;
      liveEls.ovTitle.textContent = 'Hold the starting position';
      liveEls.count.hidden = false;
      liveEls.count.textContent = n;
      speak(n === seconds ? `Hold still. ${n}` : String(n));
      n -= 1;
      session.calTimer = setTimeout(tick, 1000);
    } else {
      session.q0 = session.latest;
      session.state = 'track';
      liveEls.overlay.hidden = true;
      speak('Go');
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    }
  };
  tick();
}

// Overlay prompt shown until the thumb is on the pad.
function waitForThumb() {
  if (!session || !liveEls) return;
  session.state = 'wait';
  liveEls.overlay.hidden = false;
  liveEls.ovTitle.textContent = 'Put your thumb on the pad to begin';
  liveEls.count.hidden = true;
  speak('Put your thumb on the pad');
}

// Thumb pad = grip check + dead-man switch. Tracking only runs while it is held.
function setHeld(held) {
  if (!session || !liveEls || session.held === held) return;
  session.held = held;
  liveEls.pad.classList.toggle('held', held);
  if (held) {
    if (session.state === 'wait') calibrate(3);
    else if (session.state === 'track' && session.paused) { session.paused = false; renderLive(); speak('Go'); }
  } else {
    if (session.state === 'cal') { clearTimeout(session.calTimer); waitForThumb(); }
    else if (session.state === 'track') { session.paused = true; session.det.dir = 0; session.det.peak = 0; renderLive(); speak('Paused. Thumb on the pad'); }
  }
}

function speak(text) {
  if (settings.voice === false || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    speechSynthesis.speak(u);
  } catch {}
}

function makeSource(ex) {
  if (settings.source === 'sim') return new SimSource(ex.axis);
  if (settings.source === 'watch') return new WatchSource(settings.relayUrl || 'ws://localhost:8787');
  return new PhoneSource();
}

async function startSession(ex) {
  const source = makeSource(ex);
  let sign = ex.sign * (ex.handed && settings.hand === 'left' ? -1 : 1) * (settings.flips?.[ex.id] ? -1 : 1);
  session = { ex, source, q0: null, angle: 0, smooth: 0, det: new RepDetector(), sign, startedAt: Date.now(), latest: null, held: false, state: 'wait', paused: false };
  source.onSample = (q) => {
    session.latest = q;
    if (!session.q0 || session.state !== 'track' || session.paused) return; // waiting for thumb / countdown / paused
    const raw = twistDeg(relative(session.q0, q), ex.axis) * session.sign;
    session.smooth += (raw - session.smooth) * 0.35;
    session.angle = Math.round(session.smooth);
    const rep = session.det.update(session.smooth);
    if (rep) onRep(rep);
    renderLive();
  };
  await source.start();
  try { session.wake = await navigator.wakeLock?.request('screen'); } catch {}
}

function endSession() {
  clearTimeout(session?.calTimer);
  session?.source.stop();
  session?.wake?.release?.();
  try { speechSynthesis?.cancel(); } catch {}
}

// ---------- live ----------
let liveEls = null;
function live() {
  const { ex } = session;
  app.innerHTML = `
    <div class="topbar"><button class="small ghost" id="cancel">✕</button><h1>${ex.name}</h1><button class="small" id="recal">Recalibrate</button></div>
    <div class="overlay" id="overlay" hidden><div class="eyebrow" id="ov-title">Hold the starting position</div><div class="count" id="count">3</div><p class="muted">${ex.arm}</p></div>
    <button class="thumbpad" id="pad" aria-label="Thumb pad: keep your thumb here during the set">${THUMB}<span>Thumb here</span></button>
    <svg class="gauge" viewBox="0 0 300 170" id="gauge"></svg>
    <div class="angle"><div class="num" id="num">0°</div><div class="dir" id="dir">Hold neutral</div></div>
    <div class="stats">
      <div class="stat" id="repstat"><div class="v" id="reps">0</div><div class="l">reps</div></div>
      <div class="stat"><div class="v" id="best-pos">0°</div><div class="l">${ex.pos} best</div><div class="t">target ${ex.normal.pos}°</div></div>
      ${ex.neg ? `<div class="stat"><div class="v" id="best-neg">0°</div><div class="l">${ex.neg} best</div><div class="t">target ${ex.normal.neg}°</div></div>` : '<div></div>'}
    </div>
    <p class="cue">${ex.cue}</p>
    <div class="row" style="margin-top:14px">
      <button class="small ghost" id="flip">Directions look swapped?</button>
      <span class="muted" id="source-note">${settings.source === 'phone' ? 'Phone sensors' : settings.source === 'watch' ? 'Apple Watch' : 'Simulator'}</span>
    </div>
    <button class="primary block" id="finish">Finish set</button>
    <p class="muted" style="text-align:center">Keep your thumb on the pad. The set only counts while it is there.</p>
  `;
  liveEls = {
    gauge: app.querySelector('#gauge'), num: app.querySelector('#num'), dir: app.querySelector('#dir'),
    reps: app.querySelector('#reps'), repstat: app.querySelector('#repstat'), pos: app.querySelector('#best-pos'), neg: app.querySelector('#best-neg'),
    overlay: app.querySelector('#overlay'), count: app.querySelector('#count'), ovTitle: app.querySelector('#ov-title'), pad: app.querySelector('#pad'),
  };
  app.classList.add('live');
  const pad = liveEls.pad;
  if (settings.source === 'sim') {
    pad.onclick = () => setHeld(!session.held); // desktop: click toggles so the keyboard stays free
  } else {
    pad.onpointerdown = (e) => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch {} setHeld(true); };
    pad.onpointerup = pad.onpointercancel = () => setHeld(false);
    pad.oncontextmenu = (e) => e.preventDefault();
  }
  app.querySelector('#cancel').onclick = () => { endSession(); session = null; go('home'); };
  app.querySelector('#recal').onclick = () => calibrate(3);
  app.querySelector('#flip').onclick = () => {
    settings.flips[ex.id] = !settings.flips[ex.id]; saveSettings(settings);
    session.sign *= -1; session.det = new RepDetector(); session.smooth = 0;
    speak('Directions swapped');
  };
  app.querySelector('#finish').onclick = () => { endSession(); go('summary'); };
  renderLive();
}

function onRep(rep) {
  liveEls?.repstat.classList.remove('flash');
  void liveEls?.repstat.offsetWidth;
  liveEls?.repstat.classList.add('flash');
  if (navigator.vibrate) navigator.vibrate(30);
  const { ex, det } = session;
  const label = rep.dir > 0 ? ex.pos : ex.neg || ex.pos;
  speak(`${det.reps.length}. ${label} ${rep.peak}`);
}

function renderLive() {
  if (!liveEls || !session) return;
  const { ex, angle, det } = session;
  liveEls.num.textContent = `${Math.abs(angle)}°`;
  liveEls.dir.textContent = session.paused ? 'Paused. Thumb lifted' : Math.abs(angle) < 5 ? 'Neutral' : angle > 0 ? ex.pos : ex.neg || 'Past neutral';
  liveEls.reps.textContent = det.reps.length;
  liveEls.pos.textContent = `${Math.round(det.maxPos)}°`;
  if (liveEls.neg) liveEls.neg.textContent = `${Math.round(det.maxNeg)}°`;
  drawGauge(liveEls.gauge, ex, angle);
}

// Semicircular gauge: neutral at the top, positive direction to the right.
function drawGauge(svg, ex, angle) {
  const cx = 150, cy = 150, r = 120;
  const range = ex.neg ? Math.max(ex.normal.pos, ex.normal.neg) + 20 : ex.normal.pos + 20; // degrees per half-sweep
  const toXY = (deg) => { const a = (ex.neg ? deg / range : (deg / range) * 2 - 1) * (Math.PI / 2); return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
  const arc = (from, to, stroke) => {
    const [x1, y1] = toXY(from), [x2, y2] = toXY(to);
    const large = Math.abs(to - from) / range > 1 ? 1 : 0;
    const sweep = to > from ? 1 : 0;
    return `<path d="M${x1},${y1} A${r},${r} 0 ${large} ${sweep} ${x2},${y2}" fill="none" stroke="${stroke}" stroke-width="16" stroke-linecap="round"/>`;
  };
  const clamp = (v) => Math.max(ex.neg ? -range : 0, Math.min(range, v));
  const tick = (deg, label) => { const [x, y] = toXY(deg); const [tx, ty] = [cx + (r + 22) * ((x - cx) / r), cy + (r + 22) * ((y - cy) / r)]; return `<circle cx="${x}" cy="${y}" r="4" fill="var(--text-2)"/><text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="11" fill="var(--text-3)">${label}</text>`; };
  let html = arc(ex.neg ? -range : 0, range, 'var(--surface-2)');
  const a = clamp(angle);
  if (Math.abs(a) > 0.5) html += arc(0, a, 'var(--accent)');
  html += tick(ex.normal.pos, `${ex.normal.pos}°`);
  if (ex.neg) html += tick(-ex.normal.neg, `${ex.normal.neg}°`);
  const [nx, ny] = toXY(a);
  html += `<circle cx="${nx}" cy="${ny}" r="10" fill="#fff"/>`;
  svg.innerHTML = html;
}

// ---------- summary ----------
function summary() {
  const { ex, det, startedAt } = session;
  const secs = Math.round((Date.now() - startedAt) / 1000);
  const pct = (v, t) => Math.min(100, Math.round((v / t) * 100));
  const maxPos = Math.round(det.maxPos), maxNeg = Math.round(det.maxNeg);
  app.innerHTML = `
    <div class="topbar"><h1>Set complete</h1></div>
    <p class="muted">${ex.joint}: ${ex.name} · ${settings.hand} · ${Math.floor(secs / 60)}m ${secs % 60}s</p>
    <div class="stats">
      <div class="stat"><div class="v">${det.reps.length}</div><div class="l">reps</div></div>
      <div class="stat"><div class="v">${maxPos}°</div><div class="l">${ex.pos} best</div></div>
      ${ex.neg ? `<div class="stat"><div class="v">${maxNeg}°</div><div class="l">${ex.neg} best</div></div>` : '<div></div>'}
    </div>
    <div class="card">
      <div class="row"><span>${ex.pos}</span><span class="muted">${pct(maxPos, ex.normal.pos)}% of normal (${ex.normal.pos}°)</span></div>
      <div class="bar"><i style="width:${pct(maxPos, ex.normal.pos)}%"></i></div>
      ${ex.neg ? `<div class="row" style="margin-top:12px"><span>${ex.neg}</span><span class="muted">${pct(maxNeg, ex.normal.neg)}% of normal (${ex.normal.neg}°)</span></div><div class="bar"><i style="width:${pct(maxNeg, ex.normal.neg)}%"></i></div>` : ''}
    </div>
    <div class="card">
      <div class="row"><span>Pain during set</span><strong id="painv">0 / 10</strong></div>
      <input type="range" id="pain" min="0" max="10" value="0" step="1">
      <p class="muted">0 = none, 10 = worst imaginable. Tell your therapist about anything above ~4.</p>
    </div>
    <button class="primary block" id="save">Save set</button>
    <button class="block ghost" id="discard">Discard</button>
  `;
  speak(`Set complete. ${det.reps.length} reps. Best ${ex.pos} ${maxPos}${ex.neg ? `, best ${ex.neg} ${maxNeg}` : ''}.`);
  const pain = app.querySelector('#pain');
  pain.oninput = () => (app.querySelector('#painv').textContent = `${pain.value} / 10`);
  app.querySelector('#save').onclick = () => {
    saveSession({ id: crypto.randomUUID?.() || String(Date.now()), ts: startedAt, exerciseId: ex.id, hand: settings.hand, source: settings.source, reps: det.reps, maxPos, maxNeg, pain: Number(pain.value), durationS: secs });
    session = null; go('progress', ex.id);
  };
  app.querySelector('#discard').onclick = () => { session = null; go('home'); };
}

// ---------- progress ----------
function progress(selectedId) {
  const all = loadSessions();
  const id = selectedId || all.at(-1)?.exerciseId || EXERCISES[0].id;
  const ex = byId(id);
  const mine = all.filter((s) => s.exerciseId === id).sort((a, b) => a.ts - b.ts);
  app.innerHTML = `
    <div class="topbar"><button class="small ghost" id="back">‹ Back</button><h1>Progress</h1></div>
    <select id="pick" style="width:100%;font:inherit;padding:10px;border-radius:10px;background:var(--surface);color:var(--text);border:1px solid var(--border)">
      ${EXERCISES.map((e) => `<option value="${e.id}" ${e.id === id ? 'selected' : ''}>${e.joint}: ${e.name}</option>`).join('')}
    </select>
    <div id="charts"></div>
    <div id="table"></div>
    <div class="row" style="margin-top:20px">
      <button class="small" id="export">Export CSV</button>
      <button class="small ghost danger" id="clear">Clear all data</button>
    </div>
    <div id="csv"></div>
  `;
  app.querySelector('#back').onclick = () => go('home');
  app.querySelector('#pick').onchange = (e) => progress(e.target.value);
  const charts = app.querySelector('#charts');
  if (!mine.length) {
    charts.innerHTML = `<div class="card"><p>No sets recorded for this exercise yet.</p></div>`;
  } else {
    const block = (label, key, target) => {
      const wrap = document.createElement('div'); wrap.className = 'card';
      wrap.innerHTML = `<span class="eyebrow">${label} — best per set</span>`;
      wrap.appendChild(romChart({ label, target, sessions: mine.map((s) => ({ ts: s.ts, value: s[key], reps: s.reps.length, pain: s.pain })) }));
      charts.appendChild(wrap);
    };
    block(ex.pos, 'maxPos', ex.normal.pos);
    if (ex.neg) block(ex.neg, 'maxNeg', ex.normal.neg);
    app.querySelector('#table').innerHTML = `<table><thead><tr><th>Date</th><th>Reps</th><th>${ex.pos}</th>${ex.neg ? `<th>${ex.neg}</th>` : ''}<th>Pain</th></tr></thead><tbody>
      ${mine.slice().reverse().map((s) => `<tr><td>${new Date(s.ts).toLocaleDateString()}</td><td>${s.reps.length}</td><td>${s.maxPos}°</td>${ex.neg ? `<td>${s.maxNeg}°</td>` : ''}<td>${s.pain ?? '–'}</td></tr>`).join('')}
    </tbody></table>`;
  }
  app.querySelector('#export').onclick = async () => {
    const csv = exportCsv();
    try { await navigator.clipboard.writeText(csv); app.querySelector('#export').textContent = 'Copied!'; } catch {}
    app.querySelector('#csv').innerHTML = `<textarea rows="6" readonly>${csv}</textarea>`;
  };
  app.querySelector('#clear').onclick = () => {
    const b = app.querySelector('#clear');
    if (b.dataset.armed) { clearSessions(); progress(id); return; }
    b.dataset.armed = '1'; b.textContent = 'Tap again to confirm';
  };
}

go('home');
