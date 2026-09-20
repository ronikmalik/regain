// Hysteresis-based rep detector on a single angle stream.
// A rep = leaving the neutral band in one direction, then returning to it.
export class RepDetector {
  constructor({ start = 12, end = 6 } = {}) {
    this.start = start; this.end = end;
    this.dir = 0; this.peak = 0;
    this.reps = []; // {dir: 1|-1, peak}
    this.maxPos = 0; this.maxNeg = 0;
  }
  update(angle) {
    if (angle > this.maxPos) this.maxPos = angle;
    if (-angle > this.maxNeg) this.maxNeg = -angle;
    if (this.dir === 0) {
      if (Math.abs(angle) >= this.start) { this.dir = Math.sign(angle); this.peak = Math.abs(angle); }
      return null;
    }
    const a = angle * this.dir; // signed along the current direction
    if (a > this.peak) this.peak = a;
    if (a <= this.end) {
      const rep = { dir: this.dir, peak: Math.round(this.peak) };
      this.reps.push(rep);
      this.dir = 0; this.peak = 0;
      return rep;
    }
    return null;
  }
}
