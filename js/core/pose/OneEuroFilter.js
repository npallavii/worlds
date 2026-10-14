// One Euro filter (Casiez et al., CHI 2012): smooths jitter when still, stays responsive
// when moving fast. One instance per coordinate.

const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));

export class OneEuroFilter {
  constructor({ minCutoff = 1.2, beta = 0.6, dCutoff = 1 } = {}) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }

  reset() { this.x = null; this.dx = 0; }

  filter(value, dt) {
    if (this.x === null || !(dt > 0)) { this.x = value; return value; }
    const rawDx = (value - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}
