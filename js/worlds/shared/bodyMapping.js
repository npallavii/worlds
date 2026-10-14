// Turns pose landmarks into game controls. Everything is body-relative (measured in
// shoulder widths from the child's own shoulders or calibrated neutral position), so it
// works the same for a small child close to the camera and a tall adult further back.
//
// Output coordinates are "play space": 0–1 across the game screen, x to the right, y down.
import { LM, isVisible } from '../../core/pose/landmarks.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Hand positions for reaching games. The reachable box around the child's shoulders
 * (±2.5 shoulder widths sideways, from 2 sw above the shoulders down to the hips) is
 * stretched over the whole play area, so nobody has to walk to reach the edges.
 */
export function reachPoints(frame) {
  const m = frame?.metrics;
  const lm = frame?.landmarks;
  if (!m || !lm) return [];
  const sw = m.shoulderWidth;
  const top = m.shoulderMid.y - 2 * sw;
  const map = (w) => ({
    x: clamp(0.5 + (w.x - m.shoulderMid.x) / (sw * 5), 0, 1),
    y: clamp(0.1 + ((w.y - top) / (sw * 3.6)) * 0.82, 0, 1),
  });
  const out = [];
  for (const [side, i] of [['L', LM.L_WRIST], ['R', LM.R_WRIST]]) {
    if (isVisible(lm[i], 0.45)) out.push({ side, ...map(lm[i]) });
  }
  return out;
}

/**
 * Steering from −1 (left) to +1 (right). Leaning the upper body counts, and so does
 * stepping sideways, because young children often do one when asked for the other.
 * Uses the calibrated neutral pose so a child who naturally stands slightly off-centre
 * isn't steered constantly. A small dead zone keeps the submarine steady when still.
 */
export function steering(frame, calibration) {
  const m = frame?.metrics;
  if (!m) return 0;
  const sw = m.shoulderWidth;
  const lean = (m.shoulderMid.x - m.hipMid.x) / sw;
  const neutralLean = calibration ? (calibration.shoulderMid.x - calibration.hipMid.x) / calibration.shoulderWidth : 0;
  const shift = calibration ? (m.torsoMid.x - calibration.torsoMid.x) / (sw * 1.6) : 0;
  const raw = (lean - neutralLean) / 0.3 + shift;
  const dead = 0.12;
  if (Math.abs(raw) < dead) return 0;
  return clamp((raw - Math.sign(raw) * dead) / (1 - dead), -1, 1);
}

/**
 * Horizontal body position for catching games (0 = left edge, 1 = right edge).
 * Calibrated centre = middle of the screen; moving about one and a half steps either way
 * reaches the edges.
 */
export function bodyX(frame, calibration) {
  const m = frame?.metrics;
  if (!m) return null;
  const centre = calibration?.torsoMid.x ?? 0.5;
  const span = (calibration?.shoulderWidth ?? m.shoulderWidth) * 2.2;
  return clamp(0.5 + (m.torsoMid.x - centre) / span / 2, 0, 1);
}

/**
 * Counts rowing strokes: both wrists travelling from low (near the hips) to high
 * (near the shoulders) and back. A stroke is only counted once per full cycle, so
 * holding still or jittering never adds strokes.
 */
export class RowCounter {
  #phase = 'low';
  strokes = 0;

  update(frame) {
    const m = frame?.metrics, lm = frame?.landmarks;
    if (!m || !lm) return false;
    const ws = [lm[LM.L_WRIST], lm[LM.R_WRIST]].filter((w) => isVisible(w, 0.4));
    if (!ws.length) return false;
    const y = ws.reduce((s, w) => s + w.y, 0) / ws.length;
    const rel = (y - m.shoulderMid.y) / m.shoulderWidth; // ~1.5 at hips, ~0 at shoulders
    if (this.#phase === 'low' && rel < 0.55) { this.#phase = 'high'; return false; }
    if (this.#phase === 'high' && rel > 1.0) { this.#phase = 'low'; this.strokes++; return true; }
    return false;
  }
}
