// Landmark indices, geometry helpers and coordinate transforms shared by the pose service,
// calibration, and every world.
//
// Coordinate convention used everywhere in the app ("display space"):
//   x, y in 0–1 across the *mirrored* camera image, so the child's left hand appears on
//   the left of the screen, like a mirror. MediaPipe's raw x is flipped once, in PoseService.

export const LM = Object.freeze({
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
});

export const LANDMARK_COUNT = 33;

// Bones drawn by the skeleton overlay.
export const BONES = [
  [LM.L_SHOULDER, LM.R_SHOULDER], [LM.L_HIP, LM.R_HIP],
  [LM.L_SHOULDER, LM.L_HIP], [LM.R_SHOULDER, LM.R_HIP],
  [LM.L_SHOULDER, LM.L_ELBOW], [LM.L_ELBOW, LM.L_WRIST],
  [LM.R_SHOULDER, LM.R_ELBOW], [LM.R_ELBOW, LM.R_WRIST],
  [LM.L_HIP, LM.L_KNEE], [LM.L_KNEE, LM.L_ANKLE],
  [LM.R_HIP, LM.R_KNEE], [LM.R_KNEE, LM.R_ANKLE],
];

export const VISIBLE = 0.5; // minimum visibility to trust a landmark

export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const isVisible = (p, min = VISIBLE) => !!p && (p.visibility ?? 1) >= min;

/** Body measurements in display space; null when the shoulders aren't trustworthy. */
export function bodyMetrics(lm) {
  if (!lm) return null;
  const ls = lm[LM.L_SHOULDER], rs = lm[LM.R_SHOULDER];
  if (!isVisible(ls) || !isVisible(rs)) return null;
  const shoulderMid = mid(ls, rs);
  const shoulderWidth = Math.max(0.02, dist(ls, rs));
  const lh = lm[LM.L_HIP], rh = lm[LM.R_HIP];
  const hipsVisible = isVisible(lh) && isVisible(rh);
  const hipMid = hipsVisible ? mid(lh, rh) : { x: shoulderMid.x, y: shoulderMid.y + shoulderWidth * 1.6 };
  return { shoulderMid, shoulderWidth, hipMid, hipsVisible, torsoMid: mid(shoulderMid, hipMid) };
}

/**
 * Maps a display-space point onto an element showing the camera image with
 * `object-fit: cover`. Pass source size = view size when there is no video (simulation).
 */
export function toView(p, srcW, srcH, viewW, viewH) {
  const scale = Math.max(viewW / srcW, viewH / srcH);
  const drawnW = srcW * scale, drawnH = srcH * scale;
  return {
    x: p.x * drawnW - (drawnW - viewW) / 2,
    y: p.y * drawnH - (drawnH - viewH) / 2,
  };
}
