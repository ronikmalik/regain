const KEY = 'regain.sessions.v1';
const SETTINGS = 'regain.settings.v1';

export function loadSessions() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export function saveSession(s) {
  const all = loadSessions();
  all.push(s);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}
export function clearSessions() { try { localStorage.removeItem(KEY); } catch {} }

export function loadSettings() {
  try { return { hand: 'right', flips: {}, ...JSON.parse(localStorage.getItem(SETTINGS) || '{}') }; } catch { return { hand: 'right', flips: {} }; }
}
export function saveSettings(s) { try { localStorage.setItem(SETTINGS, JSON.stringify(s)); } catch {} }

export function exportCsv() {
  const rows = [['date', 'exercise', 'hand', 'reps', 'max_pos_deg', 'max_neg_deg', 'pain_0_10']];
  for (const s of loadSessions()) rows.push([new Date(s.ts).toISOString(), s.exerciseId, s.hand, s.reps.length, s.maxPos, s.maxNeg, s.pain ?? '']);
  return rows.map((r) => r.join(',')).join('\n');
}
