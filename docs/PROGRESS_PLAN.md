# Progress and insight plan

How we turn each session's motion data into progress the user can see, trust and act on.

## 1. What we capture per set (already in place)

| Field | Source | Notes |
|---|---|---|
| `reps[]` | rep detector | `dir`, `peak` (deg), `hold` (s, longest still period near the peak), `duration` (s) |
| `maxPos`, `maxNeg` | rep detector | best range per direction |
| `avgHold`, `holdGoal` | reps | mean hold and the goal in force |
| `samples[]` | 20 Hz angle trace | `[ms since tracking start, angle]`, ~12 KB per minute |
| `pain`, `durationS`, `mount`, `hand`, `source`, `ts` | session | context for every comparison |

`samples` is the important addition: it is the raw material for everything below. Storage is
localStorage today (fine for hundreds of sets); Phase 4 moves it to a synced store.

## 2. Metrics derived from the trace

All computed on device, per set, at save time (cached on the session object).

| Metric | Definition | Why it matters |
|---|---|---|
| Smoothness | normalised jerk of the angle trace per rep (lower is smoother); shown as a 0 to 100 score | Guarding and pain produce jerky movement. Improving smoothness often precedes ROM gains. |
| Symmetry | `min(pos, neg) / max(pos, neg)` for bidirectional exercises | Flags one direction lagging. |
| Hold consistency | standard deviation of `hold` across reps | Steady holds indicate control, not just reach. |
| Time to peak | ms from leaving neutral to reaching 90 % of peak | Slower time to peak with the same ROM suggests stiffness or apprehension. |
| Fatigue slope | linear fit of peak vs rep index within the set | A negative slope means the last reps fall off; useful for dosing. |
| Active vs comfortable range | peak reached on reps with `hold >= goal` vs all reps | Range you can actually hold is the clinically useful number. |

## 3. Progress UI (phased)

### Phase 1: recovery timeline (next)
- One chart per direction: best-per-set bars (existing), plus a 7-day rolling median line and the normal band shaded.
- Milestone markers on the timeline: first set, 50 %, 75 %, 90 % of normal.
- Projection: linear fit over the last 8 sets gives an estimated date to reach the target, with a plain sentence ("At this pace, ~Oct 14"). Hidden until 5 sets exist.
- Hold chart (existing) and a smoothness sparkline in the same card set.
- Tap any bar to open that set's report.

### Phase 2: session replay
- Scrub or play back a saved `samples` trace on the live gauge, with rep markers and holds highlighted.
- Overlay two sets (e.g. first set vs today) on the same axes. This is the single most motivating view: the user sees their own curve get taller and calmer.

### Phase 3: adherence and context
- Calendar heatmap of sets per day, streak, weekly totals.
- Pain vs range scatter per exercise; a note when range rises while pain falls, or when pain spikes.
- Weekly summary card: sets, best range gains per exercise, average hold, smoothness trend, one sentence of guidance.

### Phase 4: sharing and sync
- Therapist report: printable page per exercise with timeline, last three set reports, hold and smoothness trends, pain log. Shareable link or PDF.
- Optional account and sync (small backend or a hosted DB) so data survives phone changes and a therapist can view it live.
- CSV and JSON export stay available regardless.

### Phase 5: richer sensing
- Apple Watch via the relay for continuous wrist data.
- Camera-based finger tracking (MediaPipe Hands) for grip and finger ROM, which the IMU cannot see.

## 4. UX principles for the progress views
- Always show the target and the starting point; progress only means something between those two.
- Compare like with like: only sets with the same exercise, side and mount go on one chart. The mount is shown as a tag if a chart mixes them.
- One number per card as the headline, the chart as support, and a sentence that says what changed.
- Every chart is tappable and has a table view for accessibility and export.
- No streak shaming. Missed days are shown as gaps, not as red marks.

## 5. Order of work
1. DONE: Metrics module (`src/metrics.js`): smoothness, symmetry, time to peak, fatigue slope, active range. Unit tests on synthetic traces.
2. DONE: Timeline card with rolling median, normal band, milestones and projection.
3. DONE: Set report gets smoothness and time to peak; tapping a bar opens it.
4. DONE: Replay and overlay.
5. DONE: Calendar, pain correlation, weekly summary.
6. DONE: Therapist report. Sync: built (Supabase magic-link accounts, RLS, tombstone sync, consent, delete account); needs project keys to go live.
