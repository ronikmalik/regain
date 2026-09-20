// Account and sync via Supabase. Everything here is optional: with no config, or signed out,
// the app is local-only. Security is enforced server-side by Row Level Security (see
// supabase/schema.sql); this module never sees or stores a password.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, TERMS_VERSION } from './config.js';
import { loadSessions, replaceSessions, loadSettings, saveSettings } from './store.js';

const SYNC_KEY = 'regain.sync.v1';
let client = null;
const listeners = new Set();

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function sb() {
  if (!client && isConfigured()) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    client.auth.onAuthStateChange((event, session) => { for (const fn of listeners) fn(event, session); });
  }
  return client;
}

export function onAuth(fn) { listeners.add(fn); sb(); return () => listeners.delete(fn); }

export async function currentUser() {
  const c = sb(); if (!c) return null;
  const { data } = await c.auth.getUser();
  return data?.user || null;
}

// Magic link. `consent` must be true; the consent record is written to the profile after the first sign-in.
export async function signIn(email, consent) {
  const c = sb(); if (!c) throw new Error('Sync is not configured.');
  if (!consent) throw new Error('Please accept the Terms and the Privacy notice first.');
  localStorage.setItem('regain.consent.pending', JSON.stringify({ terms: TERMS_VERSION, at: new Date().toISOString() }));
  const redirect = location.origin + location.pathname;
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function signOut() { const c = sb(); if (c) await c.auth.signOut(); }

// ---------- profile + consent ----------
export async function ensureProfile(user) {
  const c = sb(); if (!c || !user) return null;
  const { data } = await c.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  const pending = JSON.parse(localStorage.getItem('regain.consent.pending') || 'null');
  if (!data) {
    const row = { user_id: user.id, settings: pickSettings(loadSettings()), terms_version: pending?.terms || TERMS_VERSION, consent_at: pending?.at || new Date().toISOString() };
    await c.from('profiles').insert(row);
    localStorage.removeItem('regain.consent.pending');
    return row;
  }
  if (pending && data.terms_version !== pending.terms) {
    await c.from('profiles').update({ terms_version: pending.terms, consent_at: pending.at }).eq('user_id', user.id);
    localStorage.removeItem('regain.consent.pending');
    return { ...data, terms_version: pending.terms };
  }
  return data;
}
export const needsReconsent = (profile) => profile && profile.terms_version !== TERMS_VERSION;
const pickSettings = (s) => ({ hand: s.hand, mount: s.mount, goal: s.goal, holdGoal: s.holdGoal, voice: s.voice });

// ---------- sync ----------
// Push local sets changed since the last push, pull everything changed remotely since the last pull,
// merge by id with last-write-wins on updatedAt. Deletes are tombstones so they propagate.
export async function sync(user, { full = false } = {}) {
  const c = sb(); if (!c || !user) return null;
  const state = JSON.parse(localStorage.getItem(SYNC_KEY) || '{}');
  const local = loadSessions();
  const tomb = state.deleted || [];

  // push
  const since = full ? 0 : state.lastPush || 0;
  const changed = local.filter((s) => (s.updatedAt || s.ts) > since);
  const rows = changed.map((s) => ({ id: s.id, user_id: user.id, exercise_id: s.exerciseId, ts: new Date(s.ts).toISOString(), data: s, deleted: false }));
  for (const id of tomb) rows.push({ id, user_id: user.id, exercise_id: 'deleted', ts: new Date().toISOString(), data: {}, deleted: true });
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await c.from('sets').upsert(rows.slice(i, i + 50), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  // pull
  let q = c.from('sets').select('id, data, deleted, updated_at').eq('user_id', user.id);
  if (!full && state.lastPull) q = q.gt('updated_at', new Date(state.lastPull).toISOString());
  const { data: remote, error } = await q;
  if (error) throw new Error(error.message);
  const byId = new Map(local.map((s) => [s.id, s]));
  let pulled = 0;
  for (const r of remote || []) {
    if (r.deleted) { if (byId.delete(r.id)) pulled++; continue; }
    const mine = byId.get(r.id);
    const theirs = r.data;
    if (!mine || (theirs.updatedAt || theirs.ts) > (mine.updatedAt || mine.ts)) { byId.set(r.id, theirs); pulled++; }
  }
  replaceSessions([...byId.values()].sort((a, b) => a.ts - b.ts));

  // settings: remote wins if newer than local save
  const { data: prof } = await c.from('profiles').select('settings, updated_at').eq('user_id', user.id).maybeSingle();
  const localSettings = loadSettings();
  if (prof?.settings && Object.keys(prof.settings).length) {
    if (!localSettings.savedAt || new Date(prof.updated_at).getTime() > localSettings.savedAt) saveSettings({ ...localSettings, ...prof.settings });
    else await c.from('profiles').update({ settings: pickSettings(localSettings) }).eq('user_id', user.id);
  }

  const now = Date.now();
  localStorage.setItem(SYNC_KEY, JSON.stringify({ lastPush: now, lastPull: now, deleted: [] }));
  return { pushed: changed.length, pulled, at: now };
}

export function markDeleted(ids) {
  const state = JSON.parse(localStorage.getItem(SYNC_KEY) || '{}');
  state.deleted = [...new Set([...(state.deleted || []), ...ids])];
  localStorage.setItem(SYNC_KEY, JSON.stringify(state));
}
export function syncState() { return JSON.parse(localStorage.getItem(SYNC_KEY) || '{}'); }
export function resetSyncState() { localStorage.removeItem(SYNC_KEY); }

// Delete every cloud row and the account itself. Local data is left untouched.
export async function deleteAccount() {
  const c = sb(); if (!c) return;
  const { error } = await c.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await c.auth.signOut();
  resetSyncState();
}
