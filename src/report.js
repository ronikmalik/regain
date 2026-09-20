// Printable therapist report. Rendered into `app` with a context from main.js.
import { EXERCISES, MOUNTS, byId } from './exercises.js';
import { loadSessions } from './store.js';
import { timelineChart, projectionText } from './chart.js';
import { weeklySummary, streakInfo, painInsight } from './insights.js';

const fmtD = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDs = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pctOf = (v, t) => (t ? Math.min(100, Math.round((v / t) * 100)) : 0);

export function renderReport({ app, settings, header, go, holdGoal, repGoal }) {
  const all = loadSessions().sort((a, b) => a.ts - b.ts);
  const withData = EXERCISES.filter((e) => all.some((s) => s.exerciseId === e.id));
  const w = all.length ? weeklySummary(all, byId) : null;
  const st = streakInfo(all);
  const rows = withData.map((e) => {
    const mine = all.filter((s) => s.exerciseId === e.id);
    const recent = mine.slice(-3);
    return {
      e, mine, first: mine[0], last: mine.at(-1),
      hold: mean(recent.map((s) => s.avgHold).filter((v) => v != null)),
      smooth: mean(recent.map((s) => s.metrics?.smooth).filter((v) => v != null)),
      pain: mean(recent.map((s) => s.pain).filter((v) => v != null)),
    };
  });
  const range = (s, e) => `${s.maxPos}°${e.neg ? ' / ' + s.maxNeg + '°' : ''}`;

  app.innerHTML = `
    ${header({ title: 'Therapist report', right: `<span class="chip">${all.length} sets</span>` })}
    <div class="row noprint" style="margin:0 0 10px">
      <button class="small primary" id="print">Print / save as PDF</button>
      <button class="small outline" id="share">Share summary</button>
      <button class="small ghost" id="json">Copy JSON</button>
    </div>
    <div class="card doc">
      <div class="doc-head">
        <div><div class="word">REGAIN</div><div class="sub">RANGE OF MOTION REPORT</div></div>
        <div class="mono muted" style="text-align:right">Generated ${fmtD(Date.now())}<br>${all.length ? `${fmtDs(all[0].ts)} to ${fmtDs(all.at(-1).ts)}` : 'no data'}</div>
      </div>
      <div class="kvgrid">
        <div><span>Side</span><b>${settings.hand}</b></div>
        <div><span>Mount</span><b>${[...new Set(all.map((s) => MOUNTS[s.mount]?.short).filter(Boolean))].join(', ') || '–'}</b></div>
        <div><span>Sets</span><b>${all.length}</b></div>
        <div><span>Active days (28d)</span><b>${st.activeDays28}</b></div>
        <div><span>This week</span><b>${w ? `${w.sets} sets on ${w.days} days` : '–'}</b></div>
        <div><span>Hold goal</span><b>${holdGoal}s</b></div>
      </div>
      ${w ? `<p class="insight">${w.note}</p>` : ''}
    </div>
    ${all.length ? `
    <div class="card doc">
      <span class="eyebrow">Summary by exercise</span>
      <div class="tablewrap"><table>
        <thead><tr><th>Exercise</th><th>Sets</th><th>First</th><th>Latest</th><th>% normal</th><th>Hold</th><th>Smooth</th><th>Pain</th></tr></thead>
        <tbody>${rows.map(({ e, mine, first, last, hold, smooth, pain }) => `<tr>
          <td>${e.joint} ${e.name}</td><td>${mine.length}</td><td>${range(first, e)}</td><td>${range(last, e)}</td>
          <td>${pctOf(last.maxPos, e.normal.pos)}%${e.neg ? ' / ' + pctOf(last.maxNeg, e.normal.neg) + '%' : ''}</td>
          <td>${hold == null ? '–' : hold.toFixed(1) + 's'}</td><td>${smooth == null ? '–' : Math.round(smooth)}</td><td>${pain == null ? '–' : pain.toFixed(1)}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="muted">First and latest are the best angle per set. % normal compares the latest set with typical healthy range (${withData.map((e) => `${e.name.toLowerCase()} ${e.normal.pos}°${e.neg ? '/' + e.normal.neg + '°' : ''}`).join('; ')}). Hold, smoothness and pain are averages of the last three sets.</p>
    </div>` : '<div class="card doc"><p>No sets recorded yet.</p></div>'}
    <div id="sections"></div>
    <div class="card doc">
      <span class="eyebrow">Method</span>
      <p class="muted">Angles come from the phone's inertial sensors as rotation about the joint axis relative to a neutral pose captured after a hold-still countdown. A rep is an excursion past 12° that returns to within 6° of neutral; its peak is the best angle in that rep. A hold is the longest period near the peak with angular speed under 15°/s. Smoothness scores 100 for one continuous motion per rep and drops 20 points per extra movement unit. Values are self-recorded and depend on the phone being coupled rigidly to the hand (strapped to the back of the hand is recommended). This is a home tracking aid, not a clinical instrument.</p>
    </div>
  `;

  const sections = app.querySelector('#sections');
  for (const { e, mine } of rows) {
    const sec = document.createElement('div'); sec.className = 'card doc';
    const pts = (key) => mine.map((s) => ({ id: s.id, ts: s.ts, value: s[key], reps: s.reps.length, pain: s.pain }));
    sec.innerHTML = `<div class="row" style="margin:0 0 6px"><span class="eyebrow" style="margin:0">${e.joint} · ${e.name}</span><span class="mono muted">${mine.length} sets · ${fmtDs(mine[0].ts)} to ${fmtDs(mine.at(-1).ts)}</span></div>`;
    const add = (label, key, target) => {
      const { svg, proj } = timelineChart({ points: pts(key), target, label, project: mine.length >= 5 });
      const h = document.createElement('div'); h.className = 'eyebrow'; h.style.margin = '8px 0 0'; h.textContent = `${label} · best per set`;
      sec.appendChild(h); sec.appendChild(svg);
      const t = projectionText(proj, target, '°', label);
      if (t) sec.insertAdjacentHTML('beforeend', `<p class="muted" style="margin:2px 0 6px">${t}</p>`);
    };
    add(e.pos, 'maxPos', e.normal.pos);
    if (e.neg) add(e.neg, 'maxNeg', e.normal.neg);
    const last3 = mine.slice(-3).reverse();
    sec.insertAdjacentHTML('beforeend', `<div class="eyebrow" style="margin:10px 0 4px">Last three sets</div><div class="tablewrap"><table>
      <thead><tr><th>Date</th><th>Reps</th><th>${e.pos}</th>${e.neg ? `<th>${e.neg}</th>` : ''}<th>Hold</th><th>Held</th><th>Smooth</th><th>Pain</th></tr></thead>
      <tbody>${last3.map((s) => `<tr><td>${fmtDs(s.ts)}</td><td>${s.reps.length}</td><td>${s.maxPos}°</td>${e.neg ? `<td>${s.maxNeg}°</td>` : ''}<td>${s.avgHold != null ? s.avgHold.toFixed(1) + 's' : '–'}</td><td>${s.metrics?.active ? s.metrics.active.pos + '°' : '–'}</td><td>${s.metrics?.smooth ?? '–'}</td><td>${s.pain ?? '–'}</td></tr>`).join('')}</tbody></table></div>`);
    const pi = painInsight(mine, e);
    if (pi.note) sec.insertAdjacentHTML('beforeend', `<p class="muted" style="margin:8px 0 0"><b>Pain and range:</b> ${pi.note}</p>`);
    sections.appendChild(sec);
  }

  app.querySelector('#back').onclick = () => go('progress');
  app.querySelector('#print').onclick = () => window.print();
  const summaryText = () => [
    `Regain ROM report, ${settings.hand} side, ${fmtD(Date.now())}`,
    ...rows.map(({ e, mine, first, last }) => `${e.joint} ${e.name}: ${range(first, e)} to ${range(last, e)} over ${mine.length} sets (${pctOf(last.maxPos, e.normal.pos)}% of normal)`),
    w ? w.note : '',
  ].join('\n');
  app.querySelector('#share').onclick = async () => {
    const text = summaryText();
    try {
      if (navigator.share) await navigator.share({ title: 'Regain report', text });
      else { await navigator.clipboard.writeText(text); app.querySelector('#share').textContent = 'Copied summary'; }
    } catch {}
  };
  app.querySelector('#json').onclick = async () => {
    const payload = { exported: new Date().toISOString(), settings: { hand: settings.hand, mount: settings.mount, holdGoal, repGoal }, sessions: all };
    try { await navigator.clipboard.writeText(JSON.stringify(payload)); app.querySelector('#json').textContent = 'Copied JSON'; } catch {}
  };
}
