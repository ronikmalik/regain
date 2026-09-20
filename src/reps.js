// Hysteresis-based rep detector on a single angle stream, with hold timing.
// A rep = leaving the neutral band in one direction, then returning to it.
// A "hold" is time spent near the rep's peak while barely moving. The longest
// continuous hold in the rep is reported, which is what a therapist means by
// "move, hold for N seconds, return".
export class RepDetector {
  constructor({ start = 12, end = 6, holdBand = 5, holdSpeed = 15, speedWindow = 300 } = {}) {
    this.start = start; this.end = end;
    this.holdBand = holdBand;   // degrees below the running peak that still counts as "at the peak"
    this.holdSpeed = holdSpeed; // deg/s; slower than this counts as holding
    this.speedWindow = speedWindow; // ms; speed is measured across this window so sensor jitter does not break a hold
    this.dir = 0; this.peak = 0;
    this.reps = []; // {dir: 1|-1, peak, hold (s), duration (s)}
    this.maxPos = 0; this.maxNeg = 0;
    this._hist = []; this._t0 = 0; this._holdStart = null; this._bestHold = 0;
  }

  // Seconds of the current continuous hold, or 0.
  holding(t) { return this._holdStart == null ? 0 : (t - this._holdStart) / 1000; }

  update(angle, t = performance.now()) {
    if (angle > this.maxPos) this.maxPos = angle;
    if (-angle > this.maxNeg) this.maxNeg = -angle;
    if (this.dir === 0) {
      if (Math.abs(angle) >= this.start) {
        this.dir = Math.sign(angle); this.peak = Math.abs(angle);
        this._t0 = t; this._hist = [[t, this.peak]]; this._holdStart = null; this._bestHold = 0; this._holdFrom = null; this._holdTo = null;
      }
      return null;
    }
    const a = angle * this.dir; // signed along the current direction
    if (a > this.peak) this.peak = a;
    // angular speed across the window
    this._hist.push([t, a]);
    while (this._hist.length > 2 && t - this._hist[0][0] > this.speedWindow) this._hist.shift();
    const [t0, a0] = this._hist[0];
    const speed = t - t0 >= this.speedWindow * 0.5 ? Math.abs(a - a0) / ((t - t0) / 1000) : Infinity;
    const atPeak = a >= this.peak - this.holdBand && speed < this.holdSpeed;
    if (atPeak) {
      if (this._holdStart == null) this._holdStart = t;
      const h = (t - this._holdStart) / 1000;
      if (h > this._bestHold) { this._bestHold = h; this._holdFrom = this._holdStart; this._holdTo = t; }
    }
    else this._holdStart = null;

    if (a <= this.end) {
      const rep = { dir: this.dir, peak: Math.round(this.peak), hold: Math.round(this._bestHold * 10) / 10, duration: Math.round((t - this._t0) / 100) / 10, t0: Math.round(this._t0), t1: Math.round(t) };
      if (this._holdFrom != null) { rep.holdFrom = Math.round(this._holdFrom); rep.holdTo = Math.round(this._holdTo); }
      this.reps.push(rep);
      this.dir = 0; this.peak = 0; this._holdStart = null;
      return rep;
    }
    return null;
  }
}
