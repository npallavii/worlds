// Animation clips for the shared humanoid rig.
//
// A clip is { duration, loop, pose(t, opts) } where pose() returns a partial pose.
// Pose channels (all characters that use this rig expose the same parts):
//   y, rot, sx, sy           whole body bob / lean / squash
//   headRot, headY           head tilt & nod
//   armL, armR               shoulder raise, degrees. 0 = hanging, 90 = sideways, 180 = straight up
//   elbowL, elbowR           forearm bend (outward-positive, mirrored for the right side)
//   legL, legR               hip swing outward
//   antenna                  accessory wobble (antenna, hat tip, tail…)
//   eyeX, eyeY               gaze offset in px
//   mouthOpen                0–1, used while talking
//   eyes: 'normal' | 'happy'      mouth: 'smile' | 'grin'

export const BASE_POSE = Object.freeze({
  y: 0, rot: 0, sx: 1, sy: 1,
  headRot: 0, headY: 0,
  armL: 8, armR: 8, elbowL: 10, elbowR: 10,
  legL: 0, legR: 0,
  antenna: 0,
  eyeX: 0, eyeY: 0,
  mouthOpen: 0,
  eyes: 'normal',
  mouth: 'smile',
});

const { sin, cos, abs, max, min, PI } = Math;
const ramp = (t, d = 0.35) => min(1, t / d); // ease-in for raised limbs

function idle(t) {
  const b = t * 2.2;
  return {
    y: sin(b) * 1.6,
    sy: 1 + sin(b) * 0.012,
    sx: 1 - sin(b) * 0.006,
    armL: 8 + sin(b + 0.5) * 2.5,
    armR: 8 + sin(b + 0.5) * 2.5,
    antenna: sin(t * 1.6) * 7,
    headRot: sin(t * 0.7) * 1.5,
  };
}

export const CLIPS = {
  idle: { loop: true, pose: idle },

  lookAround: {
    duration: 3.4,
    pose: (t) => {
      const p = sin((t / 3.4) * PI * 2);
      return { ...idle(t), headRot: p * 11, eyeX: p * 6, eyeY: -abs(p) * 1.5 };
    },
  },

  wave: {
    duration: 2.4,
    pose: (t) => ({
      ...idle(t),
      armR: 150 * ramp(t),
      elbowR: 25 + sin(t * 11) * 28 * ramp(t, 0.5),
      headRot: -6,
      eyeX: 2,
      mouth: 'grin',
    }),
  },

  talk: {
    loop: true,
    pose: (t) => ({
      ...idle(t),
      mouthOpen: max(0, sin(t * 13)) * 0.75 * (0.65 + 0.35 * sin(t * 2.7)),
      headRot: sin(t * 2.6) * 4,
      armL: 22 + sin(t * 2) * 10,
      elbowL: 40 + sin(t * 2.3) * 12,
    }),
  },

  point: {
    duration: 2.2,
    pose: (t, { side = 'right' } = {}) => {
      const r = side === 'right';
      return {
        ...idle(t),
        [r ? 'armR' : 'armL']: 95 * ramp(t, 0.25),
        [r ? 'elbowR' : 'elbowL']: 4,
        headRot: r ? -7 : 7,
        eyeX: r ? 6 : -6,
        rot: r ? -2 : 2,
      };
    },
  },

  // Demonstrates a body movement for the child to copy.
  demonstrate: {
    duration: 4,
    pose: (t, { move = 'armsUp' } = {}) => {
      const ph = (1 - cos(t * PI)) / 2; // 0 → 1 → 0 every 2 s
      if (move === 'armsWide') return { ...idle(t), armL: 12 + ph * 80, armR: 12 + ph * 80, elbowL: 10 - ph * 10, elbowR: 10 - ph * 10 };
      if (move === 'balance') return { ...idle(t), armL: 12 + ph * 75, armR: 12 + ph * 75, legR: ph * 22, y: -ph * 3, rot: ph * 2 };
      // Body shapes for the Shape Castle (elbow bends inward when the arm is raised).
      if (move === 'triangle') return { ...idle(t), armL: 12 + ph * 140, armR: 12 + ph * 140, elbowL: 10 + ph * 45, elbowR: 10 + ph * 45, y: -ph * 3 };
      if (move === 'square') return { ...idle(t), armL: 12 + ph * 80, armR: 12 + ph * 80, elbowL: 10 + ph * 85, elbowR: 10 + ph * 85 };
      if (move === 'star') return { ...idle(t), armL: 12 + ph * 128, armR: 12 + ph * 128, elbowL: 10 - ph * 10, elbowR: 10 - ph * 10, legL: ph * 14, legR: ph * 14, y: -ph * 4 };
      return { ...idle(t), armL: 12 + ph * 150, armR: 12 + ph * 150, elbowL: 10 - ph * 10, elbowR: 10 - ph * 10, y: -ph * 4, legL: ph * 5, legR: ph * 5 };
    },
  },

  walk: {
    loop: true,
    pose: (t) => {
      const b = t * 6;
      return {
        y: -abs(sin(b)) * 9,
        rot: sin(b) * 2,
        legL: sin(b) * 14, legR: -sin(b) * 14,
        armL: 14 + sin(b) * 14, armR: 14 - sin(b) * 14,
        antenna: sin(b) * 12,
      };
    },
  },

  happy: {
    duration: 1.8,
    pose: (t) => ({
      y: -abs(sin(t * 7)) * 20 * (1 - (t / 1.8) * 0.5),
      sx: 1 + cos(t * 14) * 0.03, sy: 1 - cos(t * 14) * 0.03,
      armL: 150, armR: 150, elbowL: 20, elbowR: 20,
      antenna: sin(t * 14) * 18,
      eyes: 'happy', mouth: 'grin',
    }),
  },

  // Gentle "you can do it" after an unsuccessful attempt: head tilt, nod, thumbs-up.
  encourage: {
    duration: 2.8,
    pose: (t) => ({
      ...idle(t),
      headRot: 9 + sin(t * 4) * 3,
      headY: sin(t * 6) * 1.5,
      armL: 60 * ramp(t, 0.3), elbowL: 120 * ramp(t, 0.4),
      eyeX: 2,
    }),
  },

  // Victory dance.
  celebrate: {
    duration: 3.6,
    pose: (t) => {
      const b = t * 6.5;
      return {
        y: -abs(sin(b)) * 14,
        rot: sin(b / 2) * 9,
        armL: 120 + sin(b) * 40, armR: 120 - sin(b) * 40,
        elbowL: 30 + sin(b) * 20, elbowR: 30 - sin(b) * 20,
        legL: max(0, sin(b)) * 18, legR: max(0, -sin(b)) * 18,
        antenna: sin(b) * 20,
        eyes: 'happy', mouth: 'grin',
      };
    },
  },

  farewell: {
    duration: 3,
    pose: (t) => ({
      ...idle(t),
      armR: 140 * ramp(t),
      elbowR: 20 + sin(t * 8) * 22 * ramp(t, 0.5),
      headRot: 8,
      eyes: t > 1.2 ? 'happy' : 'normal',
    }),
  },
};
