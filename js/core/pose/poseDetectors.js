// Tolerant, body-size-independent pose checks.
// Every distance is measured in shoulder widths (sw), so the same thresholds work for a
// small child close to the camera and a tall adult further away.
// Each detector returns { match: boolean, score: 0–1 } — score drives "almost there" feedback.
import { LM, isVisible, bodyMetrics } from './landmarks.js';

const MOVING_PARTS = [LM.NOSE, LM.L_WRIST, LM.R_WRIST, LM.L_ELBOW, LM.R_ELBOW, LM.L_KNEE, LM.R_KNEE, LM.L_SHOULDER, LM.R_SHOULDER];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const POSES = {
  /** Both hands up high. Wrists need to be above the shoulders by ≥ 0.6 sw. */
  armsUp(lm) {
    const m = bodyMetrics(lm);
    const lw = lm?.[LM.L_WRIST], rw = lm?.[LM.R_WRIST];
    if (!m || !isVisible(lw, 0.4) || !isVisible(rw, 0.4)) return { match: false, score: 0 };
    const lift = (w) => (m.shoulderMid.y - w.y) / m.shoulderWidth; // + = above shoulders
    const score = clamp01(Math.min(lift(lw), lift(rw)) / 0.6);
    return { match: score >= 1, score };
  },

  /** Arms stretched out sideways like wings. */
  armsWide(lm) {
    const m = bodyMetrics(lm);
    const lw = lm?.[LM.L_WRIST], rw = lm?.[LM.R_WRIST];
    if (!m || !isVisible(lw, 0.4) || !isVisible(rw, 0.4)) return { match: false, score: 0 };
    const reach = Math.abs(lw.x - rw.x) / m.shoulderWidth;          // wrist span in sw (≥ 2.4 = wide)
    const level = Math.max(Math.abs(lw.y - m.shoulderMid.y), Math.abs(rw.y - m.shoulderMid.y)) / m.shoulderWidth;
    const score = clamp01((reach - 1) / 1.4) * (level < 1.1 ? 1 : 0.5);
    return { match: reach >= 2.4 && level < 1.1, score };
  },

  /** One knee lifted a little (safe balance — no big kicks needed). */
  balance(lm) {
    const m = bodyMetrics(lm);
    const lk = lm?.[LM.L_KNEE], rk = lm?.[LM.R_KNEE];
    if (!m || !isVisible(lk, 0.35) || !isVisible(rk, 0.35)) return { match: false, score: 0 };
    const lift = Math.abs(lk.y - rk.y) / m.shoulderWidth;
    const score = clamp01(lift / 0.45);
    return { match: score >= 1, score };
  },

  /** Triangle (a "rooftop"): both hands together above the head. */
  triangle(lm) {
    const m = bodyMetrics(lm);
    const lw = lm?.[LM.L_WRIST], rw = lm?.[LM.R_WRIST];
    if (!m || !isVisible(lw, 0.4) || !isVisible(rw, 0.4)) return { match: false, score: 0 };
    const sw = m.shoulderWidth;
    const lift = Math.min(m.shoulderMid.y - lw.y, m.shoulderMid.y - rw.y) / sw; // ≥ 0.9 = above the head
    const gap = Math.hypot(lw.x - rw.x, lw.y - rw.y) / sw;                        // ≤ 1.0 = hands together
    const score = clamp01(lift / 0.9) * 0.5 + clamp01((2.2 - gap) / 1.2) * 0.5;
    return { match: lift >= 0.9 && gap <= 1.0, score };
  },

  /** Square (a "window"): elbows out at shoulder height, forearms straight up. */
  square(lm) {
    const m = bodyMetrics(lm);
    const p = (i) => lm?.[i];
    const parts = [LM.L_ELBOW, LM.R_ELBOW, LM.L_WRIST, LM.R_WRIST];
    if (!m || parts.some((i) => !isVisible(p(i), 0.4))) return { match: false, score: 0 };
    const sw = m.shoulderWidth;
    const check = (elbow, wrist, shoulder) => {
      const elbowLevel = Math.abs(elbow.y - shoulder.y) / sw <= 0.6;
      const elbowOut = Math.abs(elbow.x - m.shoulderMid.x) / sw >= 0.9;
      const forearmUp = (elbow.y - wrist.y) / sw >= 0.6;
      return [elbowLevel, elbowOut, forearmUp].filter(Boolean).length;
    };
    const n = check(p(LM.L_ELBOW), p(LM.L_WRIST), p(LM.L_SHOULDER)) + check(p(LM.R_ELBOW), p(LM.R_WRIST), p(LM.R_SHOULDER));
    return { match: n === 6, score: n / 6 };
  },

  /** Star: arms stretched up and out in a big "V" (feet can be apart too, but don't need to be). */
  star(lm) {
    const m = bodyMetrics(lm);
    const lw = lm?.[LM.L_WRIST], rw = lm?.[LM.R_WRIST];
    if (!m || !isVisible(lw, 0.4) || !isVisible(rw, 0.4)) return { match: false, score: 0 };
    const sw = m.shoulderWidth;
    const lift = Math.min(m.shoulderMid.y - lw.y, m.shoulderMid.y - rw.y) / sw;
    const span = Math.abs(lw.x - rw.x) / sw;
    const score = clamp01((lift + 0.2) / 0.5) * 0.4 + clamp01((span - 1) / 1.8) * 0.6;
    return { match: lift >= 0.3 && span >= 2.8, score };
  },

  /** Relaxed standing: hands below the shoulders. Used for neutral calibration. */
  neutral(lm) {
    const m = bodyMetrics(lm);
    const lw = lm?.[LM.L_WRIST], rw = lm?.[LM.R_WRIST];
    if (!m) return { match: false, score: 0 };
    const low = (w) => !isVisible(w, 0.4) || w.y > m.shoulderMid.y + m.shoulderWidth * 0.5;
    const match = low(lw) && low(rw);
    return { match, score: match ? 1 : 0 };
  },
};

export const POSE_LABELS = {
  armsUp: 'Reach up high!',
  armsWide: 'Arms out like wings!',
  balance: 'Lift one knee a little!',
  triangle: 'Hands together over your head!',
  square: 'Elbows out, hands up — a window!',
  star: 'Arms up and out, like a star!',
};

/**
 * How much the child is moving (0 = still, 1 = dancing hard), from average joint speed
 * measured in shoulder widths per second. Smoothed so one jerky frame doesn't count.
 */
export class MotionMeter {
  #prev = null;
  #prevT = 0;
  energy = 0;

  /** Call every render frame; only new pose frames (by timestamp) change the reading. */
  update(frame) {
    const lm = frame?.landmarks;
    const sw = frame?.metrics?.shoulderWidth;
    if (!lm || !sw) { this.#prev = null; this.energy *= 0.95; return this.energy; }
    if (frame.t === this.#prevT) return this.energy;
    const dt = (frame.t - this.#prevT) / 1000;
    if (this.#prev && dt > 0 && dt < 0.5) {
      let sum = 0, n = 0;
      for (const i of MOVING_PARTS) {
        const a = lm[i], b = this.#prev[i];
        if (!isVisible(a, 0.4) || !isVisible(b, 0.4)) continue;
        sum += Math.hypot(a.x - b.x, a.y - b.y) / sw / dt;
        n++;
      }
      const raw = n ? clamp01(sum / n / 2.2) : 0;
      this.energy += (raw - this.energy) * Math.min(1, dt * 4);
    }
    this.#prev = lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility }));
    this.#prevT = frame.t;
    return this.energy;
  }

  reset() { this.#prev = null; this.#prevT = 0; this.energy = 0; }
}
