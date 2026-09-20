import { EXERCISES, MOUNTS, mountSign, byId } from './exercises.js';
import { PhoneSource, SimSource, WatchSource } from './motion.js';
import { relative, twistDeg } from './quat.js';
import { RepDetector } from './reps.js';
import { loadSessions, saveSession, clearSessions, loadSettings, saveSettings, exportCsv } from './store.js';
import { romChart } from './chart.js';
import { figure, mountFigure } from './figures.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const settings = loadSettings();
if (params.has('sim')) settings.source = 'sim';
settings.source ||= 'phone';
settings.goal ||= 10; // reps per set
settings.mount ||= 'strap';
const MOUNT = () => MOUNTS[settings.mount] || MOUNTS.strap;

let session = null; // active session state
const REP_GOAL = () => settings.goal;

// ---------- shared bits ----------
const MARK = `<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="12" fill="#0b1220" stroke="#1b2837"/><path d="M11 30a13 13 0 0 1 24.5-6" fill="none" stroke="#22d3ee" stroke-width="4" stroke-linecap="round"/><path d="M35.5 24a13 13 0 0 1 1.5 6" fill="none" stroke="#182434" stroke-width="4" stroke-linecap="round"/><circle cx="35.5" cy="24" r="3.6" fill="#e6edf3"/><circle cx="24" cy="30" r="2.4" fill="#22d3ee"/></svg>`;
const THUMB = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
  <path d="M14 40c-2-5-3-9-3-14a13 13 0 0 1 26 0c0 5-1 9-2 13"/>
  <path d="M19 41c-1.5-5-2.5-10-2.5-15a7.5 7.5 0 0 1 15 0c0 5-1 10-2.5 15"/>
  <path d="M24 42V26"/>
  <path d="M8 22a16 16 0 0 1 32 0"/>
</svg>`;
const SOURCE_LABEL = { phone: 'Phone IMU', watch: 'Apple Watch', sim: 'Simulator' };

function header({ title, back, right = '' } = {}) {
  if (title) {
    return `<div class="hdr"><button class="small ghost back" id="back">‹</button><h1>${title}</h1>${right}</div>`;
  }
  return `<div class="hdr"><div class="brand">${MARK}<div><div class="word">REGAIN</div><div class="sub">ROM TRACKER · v0.3</div></div></div>${right}</div>`;
}
function sourceChip(state = 'ok', label = SOURCE_LABEL[settings.source]) {
  return `<span class="chip ${state}" id="src-chip"><span class="dot"></span>${label}</span>`;
}
// % ring (SVG). pct 0..100, or null for "no data"
function ring(pct, size = 46) {
  const r = 18, c = 2 * Math.PI * r;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return `<svg class="ring" viewBox="0 0 46 46" width="${size}" height="${size}" aria-label="${pct == null ? 'no data' : pct + '% of normal range'}">
    <circle class="track" cx="23" cy="23" r="${r}" fill="none" stroke-width="4"/>
    <circle class="val" cx="23" cy="23" r="${r}" fill="none" stroke-width="4" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" transform="rotate(-90 23 23)"/>
    <text x="23" y="27" text-anchor="middle">${pct == null ? '–' : pct}</text></svg>`;
}
const pctOf = (v, t) => (t ? Math.min(100, Math.round((v / t) * 100)) : 0);
function recoveryPct(ex, s) {
  if (!s) return null;
  const parts = [pctOf(s.maxPos, ex.normal.pos)];
  if (ex.neg) parts.push(pctOf(s.maxNeg, ex.normal.neg));
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}
const lines = (arr) => `<ol class="steps">${arr.map((t) => `<li>${t}</li>`).join('')}</ol>`;
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ---------- routing ----------
const screens = { home, setup, live, summary, progress };
function go(name, arg) {
  window.scrollTo(0, 0);
  app.classList.remove('live', 'haspad');
  screens[name](arg);
  app.classList.remove('screen'); void app.offsetWidth; app.classList.add('screen');
}

// ---------- home ----------
function home() {
  const grouped = {};
  for (const e of EXERCISES) (grouped[e.joint] ||= []).push(e);
  const sessions = loadSessions();
  const today = new Date().toDateString();
  const setsToday = sessions.filter((s) => new Date(s.ts).toDateString() === today).length;
  const streak = computeStreak(sessions);
  const latest = EXERCISES.map((e) => recoveryPct(e, sessions.filter((s) => s.exerciseId === e.id).at(-1))).filter((v) => v != null);
  const recovery = latest.length ? Math.round(latest.reduce((a, b) => a + b, 0) / latest.length) : null;

  app.innerHTML = `
    ${header({ right: sourceChip(settings.source === 'sim' ? 'warn' : 'ok') })}
    <div class="hero">
      <div class="stat"><div class="v">${setsToday}</div><div class="l">Sets today</div></div>
      <div class="stat"><div class="v">${streak}<small>d</small></div><div class="l">Streak</div></div>
      <div class="stat"><div class="v">${recovery == null ? '–' : recovery + '<small>%</small>'}</div><div class="l">Recovery idx</div></div>
    </div>
    <div class="card config">
      <span class="eyebrow">Session config</span>
      <div class="row"><span>Phone mount</span><div class="seg" id="mount"><button aria-pressed="${settings.mount === 'strap'}" data-v="strap">Strapped</button><button aria-pressed="${settings.mount === 'held'}" data-v="held">Hand-held</button></div></div>
      <div class="row"><span>Injured side</span><div class="seg" id="hand"><button aria-pressed="${settings.hand === 'left'}" data-v="left">Left</button><button aria-pressed="${settings.hand === 'right'}" data-v="right">Right</button></div></div>
      <div class="row"><span>Sensor</span><div class="seg" id="source"><button aria-pressed="${settings.source === 'phone'}" data-v="phone">Phone</button><button aria-pressed="${settings.source === 'watch'}" data-v="watch">Watch</button><button aria-pressed="${settings.source === 'sim'}" data-v="sim">Sim</button></div></div>
      <div class="row"><span>Voice coach</span><div class="seg" id="voice"><button aria-pressed="${settings.voice !== false}" data-v="on">On</button><button aria-pressed="${settings.voice === false}" data-v="off">Off</button></div></div>
      <div class="row"><span>Rep goal per set</span><div class="seg" id="goal">${[5, 10, 15].map((g) => `<button aria-pressed="${settings.goal === g}" data-v="${g}">${g}</button>`).join('')}</div></div>
      ${settings.source === 'watch' ? `<div class="row" style="display:block"><span class="eyebrow">Relay URL</span><input id="relay" type="url" value="${settings.relayUrl || 'ws://localhost:8787'}" style="margin-top:6px"><p class="muted">Apple Watch data arrives via the Sensor Logger app → <code>npm run relay</code>. See README.</p></div>` : ''}
    </div>
    ${Object.entries(grouped).map(([joint, list]) => `
      <h2>${joint}</h2>
      ${list.map((e) => {
        const last = sessions.filter((s) => s.exerciseId === e.id).at(-1);
        return `<div class="card tap" data-id="${e.id}">${ring(recoveryPct(e, last))}<div class="body"><div class="title">${e.name}</div><div class="sub">${lastLine(e, last)}</div></div><span class="chev">›</span></div>`;
      }).join('')}
    `).join('')}
    <div class="row" style="margin-top:18px"><button class="outline" id="progress" style="width:100%">Progress &amp; history${sessions.length ? ` · ${sessions.length} sets` : ''}</button></div>
    <p class="muted" style="text-align:center;margin-top:16px">Not medical advice. Follow your therapist's plan.</p>
  `;
  app.querySelector('#progress').onclick = () => go('progress');
  segment(app.querySelector('#hand'), (v) => { settings.hand = v; saveSettings(settings); });
  segment(app.querySelector('#mount'), (v) => { settings.mount = v; saveSettings(settings); });
  segment(app.querySelector('#source'), (v) => { settings.source = v; saveSettings(settings); home(); });
  segment(app.querySelector('#voice'), (v) => { settings.voice = v === 'on'; saveSettings(settings); });
  segment(app.querySelector('#goal'), (v) => { settings.goal = Number(v); saveSettings(settings); });
  app.querySelector('#relay')?.addEventListener('change', (e) => { settings.relayUrl = e.target.value; saveSettings(settings); });
  app.querySelectorAll('.card.tap').forEach((c) => (c.onclick = () => go('setup', byId(c.dataset.id))));
}

function computeStreak(sessions) {
  const days = new Set(sessions.map((s) => new Date(s.ts).toDateString()));
  let n = 0;
  for (let d = new Date(); days.has(d.toDateString()); d.setDate(d.getDate() - 1)) n += 1;
  return n;
}

function segment(el, onChange) {
  if (!el) return;
  el.querySelectorAll('button').forEach((b) => (b.onclick = () => {
    el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    onChange(b.dataset.v);
  }));
}

function lastLine(ex, s) {
  if (!s) return 'No sets recorded';
  const parts = [`${ex.pos.slice(0, 4).toUpperCase()} ${s.maxPos}°`];
  if (ex.neg) parts.push(`${ex.neg.slice(0, 4).toUpperCase()} ${s.maxNeg}°`);
  return `${parts.join(' · ')} · ${relDate(s.ts)}`;
}
function relDate(ts) {
  const d = Math.round((Date.now() - ts) / 864e5);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
}

// ---------- setup ----------
function setup(ex) {
  app.innerHTML = `
    ${header({ title: `${ex.joint} · ${ex.name}`, right: `<span class="chip">${settings.hand} hand</span>` })}
    <div class="card figwrap">
      <div class="row" style="margin:0 0 4px"><span class="eyebrow" style="margin:0">Phone mount · ${MOUNT().name}</span><span class="chip ${settings.mount === 'strap' ? 'ok' : 'warn'}"><span class="dot"></span>${MOUNT().tag}</span></div>
      ${mountFigure(settings.mount, settings.hand)}
      <p class="muted" style="margin:6px 0 8px;text-align:center">${MOUNT().summary}</p>
      <div class="seg" id="mount" style="display:flex"><button aria-pressed="${settings.mount === 'strap'}" data-v="strap" style="flex:1">Strapped</button><button aria-pressed="${settings.mount === 'held'}" data-v="held" style="flex:1">Hand-held</button></div>
    </div>
    <div class="card figwrap">
      <span class="eyebrow">Starting position</span>
      ${figure(ex.id, settings.hand, settings.mount)}
      <div class="legend"><span><i class="sw screen"></i> screen side</span><span><i class="sw pos"></i> ${ex.pos}</span>${ex.neg ? `<span><i class="sw neg"></i> ${ex.neg}</span>` : ''}</div>
    </div>
    <div class="card grip">
      <div class="step"><span class="n">01</span><div><span class="eyebrow">Mount</span>${lines(MOUNT().how)}</div></div>
      <div class="step"><span class="n">02</span><div><span class="eyebrow">Start position</span><p>${ex.arm}</p></div></div>
      <div class="step"><span class="n">03</span><div><span class="eyebrow">Movement</span>${lines(ex.cue)}</div></div>
    </div>
    <div class="targets">
      <div class="target"><div class="k">${ex.pos} · normal</div><div class="v">${ex.normal.pos}°</div></div>
      ${ex.neg ? `<div class="target"><div class="k">${ex.neg} · normal</div><div class="v">${ex.normal.neg}°</div></div>` : ''}
      <div class="target"><div class="k">Rep goal</div><div class="v">${REP_GOAL()}<small>reps</small></div></div>
    </div>
    <div class="card"><span class="eyebrow">Before you start</span>${lines([
      'Tap Start with your other hand.',
      MOUNT().pad ? 'Lay your thumb flat over the corner pad to begin the countdown.' : 'Get into the start position during the ' + MOUNT().countdown + ' second countdown.',
      'Hold still until you hear "Go".',
      MOUNT().pad ? 'Reps only count while your thumb is on the pad.' : 'Nothing touches the screen during the set.',
      'Move slowly. Stop on sharp pain.',
    ])}</div>
    <div id="err"></div>
    <button class="primary block" id="start">Start session</button>
  `;
  app.querySelector('#back').onclick = () => go('home');
  segment(app.querySelector('#mount'), (v) => { settings.mount = v; saveSettings(settings); setup(ex); });
  app.querySelector('#start').onclick = async () => {
    const btn = app.querySelector('#start');
    btn.disabled = true; btn.textContent = 'Connecting sensors';
    try { if (settings.voice !== false) speechSynthesis?.speak(new SpeechSynthesisUtterance('')); } catch {} // iOS: unlock speech inside the tap
    try {
      await startSession(ex);
      go('live');
      if (MOUNT().pad) waitForThumb(); else calibrate(MOUNT().countdown);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Start session';
      app.querySelector('#err').innerHTML = `<div class="card error">${e.message}</div>`;
    }
  };
}

// ---------- session state machine ----------
function makeSource(ex) {
  if (settings.source === 'sim') return new SimSource(ex.axis);
  if (settings.source === 'watch') return new WatchSource(settings.relayUrl || 'ws://localhost:8787');
  return new PhoneSource();
}

async function startSession(ex) {
  const source = makeSource(ex);
  const sign = ex.sign * mountSign(ex, settings.mount) * (ex.handed && settings.hand === 'left' ? -1 : 1) * (settings.flips?.[ex.id] ? -1 : 1);
  session = { ex, source, q0: null, angle: 0, smooth: 0, det: new RepDetector(), sign, startedAt: Date.now(), latest: null, held: !MOUNT().pad, state: 'wait', paused: false, trace: [], raf: 0 };
  source.onSample = (q) => {
    session.latest = q;
    if (session.state === 'cal') return checkStill(q);
    if (!session.q0 || session.state !== 'track' || session.paused) return; // waiting for thumb / paused
    const raw = twistDeg(relative(session.q0, q), ex.axis) * session.sign;
    session.smooth += (raw - session.smooth) * 0.35;
    session.angle = Math.round(session.smooth);
    const now = performance.now();
    session.trace.push([now, session.smooth]);
    while (session.trace.length && now - session.trace[0][0] > 8000) session.trace.shift();
    const rep = session.det.update(session.smooth);
    if (rep) onRep(rep);
    scheduleRender();
  };
  await source.start();
  try { session.wake = await navigator.wakeLock?.request('screen'); } catch {}
}

function scheduleRender() {
  if (!session || session.raf) return;
  session.raf = requestAnimationFrame(() => { session && (session.raf = 0); renderLive(); });
}

function endSession() {
  clearTimeout(session?.calTimer);
  clearInterval(session?.clock);
  cancelAnimationFrame(session?.raf);
  session?.source.stop();
  session?.wake?.release?.();
  try { speechSynthesis?.cancel(); } catch {}
}

// Hold-still countdown, then the current pose becomes neutral. Also used by Recalibrate.
// The pose must stay within STILL_DEG for the whole countdown, otherwise it restarts (max 3 times):
// a grip that is still settling would otherwise be baked into the neutral reference.
const STILL_DEG = 4;
function calibrate(seconds, restart = false) {
  if (!session) return;
  clearTimeout(session.calTimer);
  session.q0 = null; session.smooth = 0; session.det = new RepDetector(); session.trace = [];
  if (!session.held) { waitForThumb(); return; }
  session.state = 'cal';
  session.calRef = null;
  session.calRestarts = restart ? (session.calRestarts || 0) + 1 : 0;
  setState('cal');
  liveEls.overlay.hidden = false;
  liveEls.ovTitle.textContent = restart ? 'Phone moved. Hold still' : 'Hold still';
  liveEls.count.hidden = false;
  let n = seconds;
  const tick = () => {
    if (!session || !liveEls || session.state !== 'cal') return;
    if (n > 0) {
      liveEls.count.textContent = n;
      speak(n === seconds ? (restart ? `Phone moved. Hold still. ${n}` : `Hold still. ${n}`) : String(n));
      n -= 1;
      session.calTimer = setTimeout(tick, 1000);
    } else {
      session.q0 = session.latest;
      session.state = 'track';
      setState('track');
      liveEls.overlay.hidden = true;
      speak('Go');
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      renderLive();
    }
  };
  tick();
}

function checkStill(q) {
  if (!session.calRef) { session.calRef = q; return; }
  const r = relative(session.calRef, q);
  const total = (2 * Math.acos(Math.min(1, Math.abs(r.w))) * 180) / Math.PI; // total rotation since the countdown began
  if (total > STILL_DEG && session.calRestarts < 3) calibrate(MOUNT().countdown, true);
}

function waitForThumb() {
  if (!session || !liveEls) return;
  session.state = 'wait';
  setState('wait');
  liveEls.overlay.hidden = false;
  liveEls.ovTitle.textContent = 'Thumb on the pad to begin';
  liveEls.count.hidden = true;
  speak('Thumb on the pad');
}

// Thumb pad = grip check + dead-man switch. Tracking only runs while it is held.
function setHeld(held) {
  if (!session || !liveEls || session.held === held) return;
  session.held = held;
  liveEls.pad.classList.toggle('held', held);
  if (held) {
    if (session.state === 'wait') calibrate(MOUNT().countdown);
    else if (session.state === 'track' && session.paused) { session.paused = false; setState('track'); renderLive(); speak('Go'); }
  } else {
    if (session.state === 'cal') { clearTimeout(session.calTimer); waitForThumb(); }
    else if (session.state === 'track') { session.paused = true; session.det.dir = 0; session.det.peak = 0; setState('paused'); renderLive(); speak('Paused'); }
  }
}

const STATE = { wait: ['warn', 'Waiting'], cal: ['live', 'Calibrating'], track: ['live', 'Tracking'], paused: ['warn', 'Paused'] };
function setState(s) {
  if (!liveEls) return;
  const [cls, label] = STATE[s];
  liveEls.state.className = `chip ${cls}`;
  liveEls.state.innerHTML = `<span class="dot"></span>${label}`;
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

// ---------- live ----------
let liveEls = null;
function live() {
  const { ex } = session;
  app.innerHTML = `
    ${header({ title: ex.name, right: `<span class="chip warn" id="state"><span class="dot"></span>Waiting</span>` })}
    <div class="overlay" id="overlay" hidden><div class="eyebrow" id="ov-title">Hold the starting position</div><div class="count" id="count">3</div><p class="muted">${ex.arm}</p></div>
    ${MOUNT().pad ? `<button class="thumbpad corner" id="pad" data-side="${settings.hand}" aria-label="Thumb pad: keep your thumb here during the set">${THUMB}<span>Thumb here</span></button>` : ''}
    <div class="card monitor">
      <div class="mhead"><span class="eyebrow">${ex.joint} · ${settings.hand} · ${SOURCE_LABEL[settings.source]}</span><span class="timer" id="timer">00:00</span></div>
      <svg class="gauge" viewBox="0 0 300 170" id="gauge"></svg>
      <div class="readout"><div class="num" id="num">0<sup>°</sup></div><div class="dir" id="dir">Neutral</div></div>
      <svg class="trace" id="trace" viewBox="0 0 320 84" preserveAspectRatio="none"></svg>
    </div>
    <div class="tiles">
      <div class="tile rep" id="repstat">${ring(0, 44)}<div><div class="v" id="reps">0</div><div class="l">of ${REP_GOAL()} reps</div></div></div>
      <div class="tile"><div class="v" id="best-pos">0°</div><div class="l">${ex.pos}</div><div class="t">target ${ex.normal.pos}°</div></div>
      ${ex.neg ? `<div class="tile"><div class="v" id="best-neg">0°</div><div class="l">${ex.neg}</div><div class="t">target ${ex.normal.neg}°</div></div>` : '<div></div>'}
    </div>
    <p class="cue">${ex.cue.slice(0, -1).join(' ')}</p>
    <div class="row" style="margin-top:10px">
      <button class="small ghost" id="flip">Swap directions</button>
      <button class="small outline" id="recal">Recalibrate</button>
    </div>
    <button class="primary block" id="finish">Finish set</button>
    <p class="muted" style="text-align:center">${MOUNT().pad ? 'Reps count only while your thumb is on the pad.' : 'Phone shifted? Tap Recalibrate.'}</p>
  `;
  liveEls = {
    gauge: app.querySelector('#gauge'), num: app.querySelector('#num'), dir: app.querySelector('#dir'), trace: app.querySelector('#trace'),
    reps: app.querySelector('#reps'), repstat: app.querySelector('#repstat'), pos: app.querySelector('#best-pos'), neg: app.querySelector('#best-neg'),
    overlay: app.querySelector('#overlay'), count: app.querySelector('#count'), ovTitle: app.querySelector('#ov-title'), pad: app.querySelector('#pad'),
    state: app.querySelector('#state'), timer: app.querySelector('#timer'),
  };
  app.classList.add('live');
  app.classList.toggle('haspad', !!MOUNT().pad);
  const pad = liveEls.pad;
  if (!pad) {
    // strapped: no dead-man switch
  } else if (settings.source === 'sim') {
    pad.onclick = () => setHeld(!session.held); // desktop: click toggles so the keyboard stays free
  } else {
    pad.onpointerdown = (e) => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch {} setHeld(true); };
    pad.onpointerup = pad.onpointercancel = () => setHeld(false);
    pad.oncontextmenu = (e) => e.preventDefault();
  }
  session.clock = setInterval(() => { if (liveEls) liveEls.timer.textContent = fmtTime(Math.round((Date.now() - session.startedAt) / 1000)); }, 1000);
  app.querySelector('#back').onclick = () => { endSession(); session = null; go('home'); };
  app.querySelector('#recal').onclick = () => calibrate(MOUNT().countdown);
  app.querySelector('#flip').onclick = () => {
    settings.flips[ex.id] = !settings.flips[ex.id]; saveSettings(settings);
    session.sign *= -1; session.det = new RepDetector(); session.smooth = 0; session.trace = [];
    speak('Directions swapped');
    renderLive();
  };
  app.querySelector('#finish').onclick = () => { endSession(); go('summary'); };
  renderLive();
}

function onRep(rep) {
  liveEls?.repstat.classList.remove('flash');
  void liveEls?.repstat.offsetWidth;
  liveEls?.repstat.classList.add('flash');
  const { ex, det } = session;
  const n = det.reps.length;
  if (navigator.vibrate) navigator.vibrate(n === REP_GOAL() ? [40, 60, 40, 60, 80] : 30);
  const label = rep.dir > 0 ? ex.pos : ex.neg || ex.pos;
  speak(n === REP_GOAL() ? `${n}. ${label} ${rep.peak}. Goal reached` : `${n}. ${label} ${rep.peak}`);
}

function renderLive() {
  if (!liveEls || !session) return;
  const { ex, angle, det } = session;
  liveEls.num.innerHTML = `${Math.abs(angle)}<sup>°</sup>`;
  liveEls.dir.textContent = session.paused ? 'Paused' : Math.abs(angle) < 5 ? 'Neutral' : angle > 0 ? ex.pos : ex.neg || 'Past neutral';
  liveEls.dir.classList.toggle('paused', session.paused);
  liveEls.reps.textContent = det.reps.length;
  const rr = liveEls.repstat.querySelector('.ring');
  if (rr) rr.outerHTML = ring(Math.min(100, Math.round((det.reps.length / REP_GOAL()) * 100)), 44);
  liveEls.pos.textContent = `${Math.round(det.maxPos)}°`;
  if (liveEls.neg) liveEls.neg.textContent = `${Math.round(det.maxNeg)}°`;
  drawGauge(liveEls.gauge, ex, angle);
  drawTrace(liveEls.trace, ex, session.trace);
}

// Semicircular gauge: neutral at the top, positive direction to the right.
function drawGauge(svg, ex, angle) {
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

// Rolling 8-second strip chart of the angle, like a monitor trace.
function drawTrace(svg, ex, trace) {
  const W = 320, H = 84, pad = 6;
  const range = ex.neg ? Math.max(ex.normal.pos, ex.normal.neg) + 20 : ex.normal.pos + 20;
  const lo = ex.neg ? -range : 0;
  const y = (v) => pad + (H - 2 * pad) * (1 - (v - lo) / (range - lo));
  const now = performance.now();
  let html = '';
  html += `<rect class="band" x="0" y="${y(ex.normal.pos)}" width="${W}" height="${y(0) - y(ex.normal.pos)}"/>`;
  if (ex.neg) html += `<rect class="band" x="0" y="${y(0)}" width="${W}" height="${y(-ex.normal.neg) - y(0)}"/>`;
  html += `<line class="zero" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>`;
  html += `<text x="4" y="${y(range) + 9}">${range}°</text><text x="4" y="${y(lo) - 2}">${lo}°</text><text x="${W - 4}" y="${H - 3}" text-anchor="end">8s</text>`;
  if (trace.length > 1) {
    const pts = trace.map(([t, v]) => `${(W * (1 - (now - t) / 8000)).toFixed(1)},${y(Math.max(lo, Math.min(range, v))).toFixed(1)}`).join(' ');
    html += `<polyline class="line" points="${pts}"/>`;
  }
  svg.innerHTML = html;
}

// ---------- summary ----------
function summary() {
  const { ex, det, startedAt } = session;
  const secs = Math.round((Date.now() - startedAt) / 1000);
  const maxPos = Math.round(det.maxPos), maxNeg = Math.round(det.maxNeg);
  const reps = det.reps;
  const goalHit = reps.length >= REP_GOAL();
  let pain = 0;
  app.innerHTML = `
    ${header({ title: 'Session report', right: `<span class="chip ${goalHit ? 'ok' : ''}"><span class="dot"></span>${goalHit ? 'Goal met' : 'Complete'}</span>` })}
    <div class="tiles" style="margin-top:0">
      <div class="tile"><div class="v">${reps.length}</div><div class="l">reps</div><div class="t">goal ${REP_GOAL()}</div></div>
      <div class="tile"><div class="v">${maxPos}°</div><div class="l">${ex.pos}</div><div class="t">${pctOf(maxPos, ex.normal.pos)}% of ${ex.normal.pos}°</div></div>
      ${ex.neg ? `<div class="tile"><div class="v">${maxNeg}°</div><div class="l">${ex.neg}</div><div class="t">${pctOf(maxNeg, ex.normal.neg)}% of ${ex.normal.neg}°</div></div>` : `<div class="tile"><div class="v">${fmtTime(secs)}</div><div class="l">duration</div></div>`}
    </div>
    <div class="card">
      <span class="eyebrow">Range vs. normal</span>
      <div class="row" style="margin-top:4px"><span>${ex.pos}</span><span class="mono muted">${maxPos}° / ${ex.normal.pos}°</span></div>
      <div class="bar"><i style="width:${pctOf(maxPos, ex.normal.pos)}%"></i></div>
      ${ex.neg ? `<div class="row" style="margin-top:12px"><span>${ex.neg}</span><span class="mono muted">${maxNeg}° / ${ex.normal.neg}°</span></div><div class="bar"><i style="width:${pctOf(maxNeg, ex.normal.neg)}%"></i></div>` : ''}
    </div>
    <div class="card">
      <span class="eyebrow">Peak per rep</span>
      ${reps.length ? repsChart(ex, reps) : '<p class="muted">No reps detected. A rep must pass 12° and return to neutral.</p>'}
    </div>
    <div class="card report">
      <span class="eyebrow">Details</span>
      <div class="kv"><span>Exercise</span><b>${ex.joint} · ${ex.name}</b></div>
      <div class="kv"><span>Side</span><b>${settings.hand}</b></div>
      <div class="kv"><span>Duration</span><b>${fmtTime(secs)}</b></div>
      <div class="kv"><span>Sensor</span><b>${SOURCE_LABEL[settings.source]}</b></div>
      <div class="kv"><span>Mount</span><b>${MOUNT().short}</b></div>
      <div class="kv"><span>Recorded</span><b>${new Date(startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</b></div>
    </div>
    <div class="card">
      <div class="row" style="margin:0"><span class="eyebrow" style="margin:0">Pain during set</span><b class="mono" id="painv">0 / 10</b></div>
      <div class="pain" id="pain">${Array.from({ length: 11 }, (_, i) => `<button aria-pressed="${i === 0}" data-v="${i}" class="${i >= 7 ? 'hi' : i >= 4 ? 'mid' : ''}">${i}</button>`).join('')}</div>
      <div class="pain-scale"><span>none</span><span>moderate</span><span>severe</span></div>
      <p class="muted">Report pain above 4, or any sharp pain, to your therapist.</p>
    </div>
    <button class="primary block" id="save">Save to history</button>
    <button class="block ghost" id="discard">Discard</button>
  `;
  speak(`Set complete. ${reps.length} reps. Best ${ex.pos} ${maxPos}${ex.neg ? `, best ${ex.neg} ${maxNeg}` : ''}.`);
  segment(app.querySelector('#pain'), (v) => { pain = Number(v); app.querySelector('#painv').textContent = `${pain} / 10`; });
  app.querySelector('#back').onclick = () => { session = null; go('home'); };
  app.querySelector('#save').onclick = () => {
    saveSession({ id: crypto.randomUUID?.() || String(Date.now()), ts: startedAt, exerciseId: ex.id, hand: settings.hand, source: settings.source, mount: settings.mount, reps, maxPos, maxNeg, pain, durationS: secs });
    session = null; go('progress', ex.id);
  };
  app.querySelector('#discard').onclick = () => { session = null; go('home'); };
}

function repsChart(ex, reps) {
  const W = 320, H = 70, max = Math.max(ex.normal.pos, ex.normal.neg || 0, ...reps.map((r) => r.peak));
  const bw = Math.min(22, (W - 8) / reps.length - 4);
  const bars = reps.map((r, i) => {
    const h = Math.max(2, (r.peak / max) * (H - 18)), x = 4 + i * ((W - 8) / reps.length);
    return `<rect class="${r.dir < 0 ? 'neg' : ''}" x="${x}" y="${H - 14 - h}" width="${bw}" height="${h}" rx="3"/><text x="${x + bw / 2}" y="${H - 3}" text-anchor="middle" font-size="9" font-family="var(--mono)" fill="var(--text-3)">${i + 1}</text>`;
  }).join('');
  const t = (v) => `<line x1="4" x2="${W - 4}" y1="${H - 14 - (v / max) * (H - 18)}" y2="${H - 14 - (v / max) * (H - 18)}" stroke-dasharray="3 3"/>`;
  return `<svg class="reps-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${t(ex.normal.pos)}${ex.neg ? t(ex.normal.neg) : ''}${bars}</svg>
    <div class="legend"><span><i class="sw pos"></i> ${ex.pos}</span>${ex.neg ? `<span><i class="sw neg"></i> ${ex.neg}</span>` : ''}<span class="muted">dashed: normal range</span></div>`;
}

// ---------- progress ----------
function progress(selectedId) {
  const all = loadSessions();
  const id = selectedId || all.at(-1)?.exerciseId || EXERCISES[0].id;
  const ex = byId(id);
  const mine = all.filter((s) => s.exerciseId === id).sort((a, b) => a.ts - b.ts);
  app.innerHTML = `
    ${header({ title: 'Progress', right: `<span class="chip">${all.length} sets</span>` })}
    <div class="chips" id="pick">${EXERCISES.map((e) => `<button aria-pressed="${e.id === id}" data-v="${e.id}">${e.joint} · ${e.name}</button>`).join('')}</div>
    <div id="charts"></div>
    <div id="table"></div>
    <div class="row" style="margin-top:20px">
      <button class="small outline" id="export">Export CSV</button>
      <button class="small ghost danger" id="clear">Clear all data</button>
    </div>
    <div id="csv"></div>
  `;
  app.querySelector('#back').onclick = () => go('home');
  segment(app.querySelector('#pick'), (v) => progress(v));
  const charts = app.querySelector('#charts');
  if (!mine.length) {
    charts.innerHTML = `<div class="card"><p>No sets yet.</p></div>`;
  } else {
    const block = (label, key, target) => {
      const wrap = document.createElement('div'); wrap.className = 'card';
      const latest = mine.at(-1)[key], first = mine[0][key];
      wrap.innerHTML = `<div class="row" style="margin:0 0 4px"><span class="eyebrow" style="margin:0">${label} · best per set</span><span class="mono muted">${first}° → ${latest}° · ${pctOf(latest, target)}% of normal</span></div>`;
      wrap.appendChild(romChart({ label, target, sessions: mine.map((s) => ({ ts: s.ts, value: s[key], reps: s.reps.length, pain: s.pain })) }));
      charts.appendChild(wrap);
    };
    block(ex.pos, 'maxPos', ex.normal.pos);
    if (ex.neg) block(ex.neg, 'maxNeg', ex.normal.neg);
    app.querySelector('#table').innerHTML = `<div class="card"><span class="eyebrow">Session log</span><table><thead><tr><th>Date</th><th>Reps</th><th>${ex.pos}</th>${ex.neg ? `<th>${ex.neg}</th>` : ''}<th>Pain</th></tr></thead><tbody>
      ${mine.slice().reverse().map((s) => `<tr><td>${new Date(s.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td><td>${s.reps.length}</td><td>${s.maxPos}°</td>${ex.neg ? `<td>${s.maxNeg}°</td>` : ''}<td>${s.pain ?? '–'}</td></tr>`).join('')}
    </tbody></table></div>`;
  }
  app.querySelector('#export').onclick = async () => {
    const csv = exportCsv();
    try { await navigator.clipboard.writeText(csv); app.querySelector('#export').textContent = 'Copied to clipboard'; } catch {}
    app.querySelector('#csv').innerHTML = `<textarea rows="6" readonly>${csv}</textarea>`;
  };
  app.querySelector('#clear').onclick = () => {
    const b = app.querySelector('#clear');
    if (b.dataset.armed) { clearSessions(); progress(id); return; }
    b.dataset.armed = '1'; b.textContent = 'Tap again to confirm';
  };
}

go('home');
