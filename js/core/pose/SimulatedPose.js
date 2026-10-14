// Mouse & keyboard stand-in for the webcam. Produces the same 33-landmark display-space
// frames as the camera path, so every world can be played and tested without a webcam.
//
//   Mouse left/right ......... move your body
//   Hold mouse button ........ your right hand follows the pointer (reach / tap)
//   1 / 2 / 3 / 4 ............ arms down · arms up · arms wide · lift one knee
//   5 / 6 / 7 ................ triangle · square · star body shapes
//   ← / → (hold) ............. lean left / right
//   Space (hold) ............. row your arms
import { LANDMARK_COUNT, LM } from './landmarks.js';

export const SIM_HELP = [
  ['Mouse', 'Move side to side'],
  ['Hold click', 'Right hand follows the pointer'],
  ['1 2 3 4', 'Arms down · up · wide · lift knee'],
  ['5 6 7', 'Triangle · square · star shapes'],
  ['← →', 'Lean'],
  ['Space', 'Row your arms'],
];

export class SimulatedPose {
  #ctrl = null;
  #state = { x: 0.5, px: 0.5, py: 0.5, reach: false, pose: 'down', lean: 0, leanKeys: { left: false, right: false }, rowing: false };

  start() {
    this.#ctrl = new AbortController();
    const signal = this.#ctrl.signal;
    const s = this.#state;
    window.addEventListener('pointermove', (e) => {
      s.px = e.clientX / window.innerWidth;
      s.py = e.clientY / window.innerHeight;
      if (!s.reach) s.x = Math.min(0.85, Math.max(0.15, s.px)); // body stays put while the hand reaches
    }, { signal, passive: true });
    window.addEventListener('pointerdown', (e) => { if (e.button === 0 && !e.target.closest('button, a, input, dialog')) s.reach = true; }, { signal });
    window.addEventListener('pointerup', () => { s.reach = false; }, { signal });
    window.addEventListener('keydown', (e) => {
      if (e.target.closest?.('input, textarea')) return;
      const poses = { 1: 'down', 2: 'up', 3: 'wide', 4: 'balance', 5: 'triangle', 6: 'square', 7: 'star' };
      if (poses[e.key]) s.pose = poses[e.key];
      if (e.key === 'ArrowLeft') s.leanKeys.left = true;
      if (e.key === 'ArrowRight') s.leanKeys.right = true;
      if (e.key === ' ' && !e.target.closest?.('button')) { s.rowing = true; e.preventDefault(); }
    }, { signal });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') s.leanKeys.left = false;
      if (e.key === 'ArrowRight') s.leanKeys.right = false;
      if (e.key === ' ') s.rowing = false;
    }, { signal });
  }

  stop() {
    this.#ctrl?.abort();
    this.#ctrl = null;
  }

  /** Builds a synthetic skeleton for time t (seconds). */
  sample(t) {
    const s = this.#state;
    const target = (s.leanKeys.right ? 1 : 0) - (s.leanKeys.left ? 1 : 0);
    s.lean += (target - s.lean) * 0.2;

    const sw = 0.16;                       // shoulder width in display units
    const cx = s.x, lean = s.lean * 0.07;
    const shY = 0.36, hipY = 0.6, kneeY = 0.76, ankleY = 0.92;
    const pts = Array.from({ length: LANDMARK_COUNT }, () => ({ x: cx, y: 0.5, z: 0, visibility: 0.2 }));
    const set = (i, x, y) => { pts[i] = { x, y, z: 0, visibility: 0.98 }; };

    // Child's left side appears on screen-left in display (mirrored) space.
    const lsx = cx - sw / 2 + lean, rsx = cx + sw / 2 + lean;
    set(LM.NOSE, cx + lean * 1.3, shY - sw * 0.9);
    set(LM.L_SHOULDER, lsx, shY);
    set(LM.R_SHOULDER, rsx, shY);
    set(LM.L_HIP, cx - sw * 0.38, hipY);
    set(LM.R_HIP, cx + sw * 0.38, hipY);

    const kneeLift = s.pose === 'balance' ? sw * 0.6 : 0;
    set(LM.L_KNEE, cx - sw * 0.38, kneeY);
    set(LM.R_KNEE, cx + sw * 0.38, kneeY - kneeLift);
    set(LM.L_ANKLE, cx - sw * 0.38, ankleY);
    set(LM.R_ANKLE, cx + sw * 0.42, ankleY - kneeLift * 1.2);

    // Arms: [elbow, wrist] offsets from each shoulder, in shoulder widths, for the left arm.
    const ARMS = {
      down: [[-0.15, 0.8], [-0.2, 1.55]],
      up: [[-0.35, -0.75], [-0.4, -1.55]],
      wide: [[-0.8, 0.02], [-1.6, 0.04]],
      balance: [[-0.7, 0.15], [-1.4, 0.2]],
      triangle: [[-0.45, -0.75], [0.42, -1.5]],
      square: [[-0.9, 0.05], [-0.95, -0.9]],
      star: [[-0.6, -0.45], [-1.25, -0.95]],
    };
    let [el, wr] = ARMS[s.pose];
    if (s.rowing) {
      const r = Math.sin(t * 7);
      el = [-0.5, 0.3 + r * 0.35];
      wr = [-0.55 + r * 0.35, 0.7 + r * 0.65]; // hands sweep from hip height up to the shoulders
    }
    set(LM.L_ELBOW, lsx + el[0] * sw, shY + el[1] * sw);
    set(LM.L_WRIST, lsx + wr[0] * sw, shY + wr[1] * sw);
    set(LM.R_ELBOW, rsx - el[0] * sw, shY + el[1] * sw);
    set(LM.R_WRIST, rsx - wr[0] * sw, shY + wr[1] * sw);

    if (s.reach) {
      // Right hand follows the pointer, elbow halfway.
      const w = { x: s.px, y: s.py };
      set(LM.R_WRIST, w.x, w.y);
      set(LM.R_ELBOW, (rsx + w.x) / 2 + 0.02, (shY + w.y) / 2 + 0.03);
    }
    return pts;
  }
}
