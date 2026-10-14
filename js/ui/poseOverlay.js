// Draws a friendly skeleton (rounded bones + joint dots) over a camera preview or sim stage.
import { BONES, LM, isVisible } from '../core/pose/landmarks.js';
import { pose } from '../core/pose/PoseService.js';

const JOINTS = [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_ELBOW, LM.R_ELBOW, LM.L_WRIST, LM.R_WRIST,
  LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE];

/** Resizes the canvas backing store to its CSS size × devicePixelRatio. Returns CSS size. */
export function fitCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export function drawSkeleton(canvas, frame, { color = '#3ed1c8', good = true, show = true } = {}) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  if (!show || !frame?.landmarks) return;
  const lm = frame.landmarks;
  const P = (i) => pose.toView(lm[i], w, h);
  const scale = Math.max(4, Math.min(w, h) / 70);

  ctx.lineCap = 'round';
  ctx.strokeStyle = good ? color : '#ffb38a';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = scale * 1.4;
  for (const [a, b] of BONES) {
    if (!isVisible(lm[a], 0.4) || !isVisible(lm[b], 0.4)) continue;
    const pa = P(a), pb = P(b);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const i of JOINTS) {
    if (!isVisible(lm[i], 0.4)) continue;
    const p = P(i);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, scale * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (i === LM.L_WRIST || i === LM.R_WRIST) ? '#ffc857' : (good ? color : '#ffb38a');
    ctx.beginPath(); ctx.arc(p.x, p.y, scale * 0.75, 0, Math.PI * 2); ctx.fill();
  }
  if (isVisible(lm[LM.NOSE], 0.4)) {
    const n = P(LM.NOSE);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = scale * 0.8;
    ctx.beginPath(); ctx.arc(n.x, n.y, scale * 4, 0, Math.PI * 2); ctx.stroke();
  }
}
