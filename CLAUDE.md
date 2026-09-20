# Regain (web reference implementation)

Phone-based range-of-motion tracker for wrist, forearm, elbow and shoulder rehab. Built 2026-09-20 on
Windows, frozen as the reference for a native iOS app being started in a sibling folder.

Full handoff (conversation narrative, decisions, measurement method, native plan):
https://claude.ai/code/artifact/eaad32ed-e69e-4430-ad80-acbaa686b029

## Status

- Frozen. Do not add features here unless asked; the native app is the active project.
- Live at https://ronikmalik.github.io/regain/ (auto-deploys from `main` via GitHub Actions).
- Cloud sync (`src/cloud.js`, `supabase/schema.sql`) is intentionally unconfigured. Local-only by design.

## Commands

- `npm run dev` HTTPS dev server for the phone (self-signed cert); `npm run dev:http` plain HTTP for desktop.
- `?sim=1` on any URL enables the keyboard/slider simulator (arrow keys drive the angle; the pad toggles on click).
- `npm run build`; `GH_PAGES=1 npm run build` for the `/regain/` base path.
- `node scripts/make-icons.mjs` regenerates PWA icons.

## Where things are

- Math: `src/quat.js` (twist about an axis), `src/reps.js` (rep + hold detector), `src/metrics.js`.
- Exercises, mounts, grips, copy: `src/exercises.js`. Figures: `src/figures.js`. Gauge: `src/gauge.js`.
- Screens: `src/main.js`; report `src/report.js`; replay/overlay `src/replay.js`; insights `src/insights.js`; charts `src/chart.js`.
- Design tokens at the top of `src/style.css`; fonts self-hosted in `public/fonts`.
- Legal: `src/legal.js`, `docs/LEGAL.md`. Plan: `docs/PROGRESS_PLAN.md`.

## Conventions that must not drift

- Device frame: +Y wrist to fingertips, +X thumb side (right hand), +Z out of palm (hand-held). Strap mount mirrors X and Z (`mountSign`).
- Rep: leave neutral past 12 deg, return within 6 deg. Hold: within 5 deg of peak and under 15 deg/s over a 300 ms window.
- Calibration countdown restarts if rotation exceeds 4 deg (max 3 restarts).
- Copy: short numbered steps, no em dashes, no medical or diagnostic claims, always defer to the therapist.
- Signs in the exercise table are unverified on hardware; keep the swap-directions control until verified.
