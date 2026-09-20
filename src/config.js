// Supabase project settings. The anon key is a public, client-side key by design:
// all access control is enforced by Row Level Security in supabase/schema.sql.
// Leave both empty to run fully offline (local storage only).
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Legal document versions. Bump when the text changes; users re-consent on next sign-in.
export const TERMS_VERSION = '2026-09-20';
export const OPERATOR = { name: 'Regain', email: '', region: '' }; // fill in before publishing: legal name or project name, contact email, country/state of operation
