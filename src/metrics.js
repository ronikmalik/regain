// Metrics derived from a set's 20 Hz angle trace and its reps.
// samples: [[ms, angle]]   reps: [{dir, peak, hold, duration}]
// All functions are pure and tolerate short or empty input (they return null when undefined).

const START = 12, END = 6; // same hysteresis as the rep detector

// Split the trace into excursions (rep segments) using the detector's hysteresis.
export function segments(samples) {
  const out = [];
  let dir = 0, i0 = 0, peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i][1];
    if (dir === 0) {
      if (Math.abs(a) >= START) {
        dir = Math.sign(a); peak = Math.abs(a);
        i0 = i; while (i0 > 0 && samples[i0 - 1][1] * dir > END) i0--; // include the whole rise out of the neutral band
      }
    } else {
      const s = a * dir;
      if (s > peak) peak = s;
      if (s <= END) { out.push({ i0, i1: i, dir, peak }); dir = 0; }
    }
  }
  return out;
}

// Centred moving average, window w (odd).
function smooth(vals, w = 5) {
  const h = Math.floor(w / 2), out = new Array(vals.length);
  for (let i = 0; i < vals.length; i++) {
    let s = 0, n = 0;
    for (let k = -h; k <= h; k++) { const j = i + k; if (j >= 0 && j < vals.length) { s += vals[j]; n++; } }
    out[i] = s / n;
  }
  return out;
}

// Movement units per rep: local maxima of |angular velocity| above 10 % of the rep's peak velocity.
// A clean out-and-back rep has 2 (one accelerate-decelerate per direction). Extra units = hesitation.
export function movementUnits(samples, seg) {
  const t = samples.slice(seg.i0, seg.i1 + 1).map((s) => s[0] / 1000);
  const a = smooth(samples.slice(seg.i0, seg.i1 + 1).map((s) => s[1]));
  if (a.length < 5) return null;
  const v = [];
  for (let i = 1; i < a.length; i++) v.push(Math.abs((a[i] - a[i - 1]) / Math.max(1e-3, t[i] - t[i - 1])));
  const vs = smooth(v, 3);
  const vmax = Math.max(...vs);
  if (!(vmax > 0)) return null;
  let units = 0;
  for (let i = 1; i < vs.length - 1; i++) if (vs[i] > vs[i - 1] && vs[i] >= vs[i + 1] && vs[i] > 0.1 * vmax) units++;
  return Math.max(1, units);
}

// 0..100. 100 = every rep is a single clean out-and-back; each extra movement unit costs 20 points.
export function smoothnessScore(samples) {
  const segs = segments(samples || []);
  const us = segs.map((s) => movementUnits(samples, s)).filter((u) => u != null);
  if (!us.length) return null;
  const mean = us.reduce((x, y) => x + y, 0) / us.length;
  return Math.round(Math.max(0, Math.min(100, 100 - 20 * (mean - 2))));
}

// Mean ms from leaving neutral to reaching 90 % of the rep's peak.
export function timeToPeak(samples) {
  const segs = segments(samples || []);
  const ts = [];
  for (const s of segs) {
    const goal = 0.9 * s.peak;
    for (let i = s.i0; i <= s.i1; i++) if (samples[i][1] * s.dir >= goal) { ts.push(samples[i][0] - samples[s.i0][0]); break; }
  }
  return ts.length ? Math.round(ts.reduce((x, y) => x + y, 0) / ts.length) : null;
}

// Peak change per rep (deg/rep) in the positive direction, by least squares. Negative = fading.
export function fatigueSlope(reps, dir = 1) {
  const ys = (reps || []).filter((r) => r.dir === dir).map((r) => r.peak);
  const n = ys.length;
  if (n < 3) return null;
  const xm = (n - 1) / 2, ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  ys.forEach((y, i) => { num += (i - xm) * (y - ym); den += (i - xm) ** 2; });
  return Math.round((num / den) * 10) / 10;
}

// Best peak among reps that met the hold goal, per direction.
export function activeRange(reps, holdGoal) {
  const best = (dir) => Math.max(0, ...(reps || []).filter((r) => r.dir === dir && r.hold >= holdGoal).map((r) => r.peak));
  return { pos: best(1), neg: best(-1) };
}

export function symmetry(maxPos, maxNeg) {
  const hi = Math.max(maxPos, maxNeg), lo = Math.min(maxPos, maxNeg);
  return hi > 0 ? Math.round((lo / hi) * 100) : null;
}

export function holdSd(reps) {
  const hs = (reps || []).map((r) => r.hold);
  if (hs.length < 2) return null;
  const m = hs.reduce((a, b) => a + b, 0) / hs.length;
  return Math.round(Math.sqrt(hs.reduce((a, h) => a + (h - m) ** 2, 0) / hs.length) * 10) / 10;
}

// Everything at once, for storing on a saved set.
export function computeMetrics(s, holdGoal) {
  return {
    smooth: smoothnessScore(s.samples),
    ttp: timeToPeak(s.samples),
    fatigue: fatigueSlope(s.reps, 1),
    active: activeRange(s.reps, holdGoal ?? s.holdGoal ?? 3),
    symmetry: s.maxNeg ? symmetry(s.maxPos, s.maxNeg) : null,
    holdSd: holdSd(s.reps),
  };
}

// ---------- history helpers ----------

// Rolling median over the previous `days` days (inclusive) for each point.
export function rollingMedian(points, days = 7) {
  const span = days * 864e5;
  return points.map((p) => {
    const win = points.filter((q) => q.ts <= p.ts && p.ts - q.ts <= span).map((q) => q.value).sort((a, b) => a - b);
    const m = win.length >> 1;
    return win.length % 2 ? win[m] : (win[m - 1] + win[m]) / 2;
  });
}

// Linear fit of value vs time over the last `n` points. Returns {slopePerDay, etaTs} or null.
export function projection(points, target, n = 8, min = 5) {
  const pts = points.slice(-n);
  if (pts.length < min) return null;
  const xs = pts.map((p) => p.ts / 864e5), ys = pts.map((p) => p.value);
  const xm = xs.reduce((a, b) => a + b, 0) / xs.length, ym = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - xm) * (ys[i] - ym); den += (x - xm) ** 2; });
  if (den === 0) return null;
  const slope = num / den, intercept = ym - slope * xm;
  if (ys.at(-1) >= target) return { slopePerDay: slope, etaTs: null, reached: true };
  if (slope <= 0.05) return { slopePerDay: slope, etaTs: null, reached: false };
  const etaDays = (target - intercept) / slope;
  return { slopePerDay: slope, etaTs: etaDays * 864e5, reached: false };
}

// First point index reaching each fraction of target.
export function milestones(points, target, fracs = [0.5, 0.75, 0.9]) {
  return fracs.map((f) => ({ frac: f, i: points.findIndex((p) => p.value >= f * target) })).filter((m) => m.i >= 0);
}
