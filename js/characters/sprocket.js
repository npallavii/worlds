// Farmer Sprocket — Bloop's farming cousin. Reuses Bloop's rig and artwork with a green and
// orange paint job, a straw hat (on the antenna channel, so it wobbles) and denim overalls.
import { BLOOP } from './bloop.js';

const PAINT = [
  ['#4fa3f7', '#7cc46a'], ['#3b8beb', '#5fae52'], ['#2fc4c0', '#f2a541'],
  ['#5cb0fa', '#86cf74'], ['#3482e0', '#4f9a47'], ['#3ed1c8', '#f2a541'],
  ['#2bb3a8', '#e08c2c'], ['#2a6cc4', '#3c7a36'], ['#1f4f99', '#6b4425'],
];

const HAT = `
  <ellipse cx="100" cy="38" rx="60" ry="11" fill="#e9c15e"/>
  <path d="M68 38 Q70 6 100 6 Q130 6 132 38 Z" fill="#f1cf6e"/>
  <rect x="68" y="26" width="64" height="8" fill="#d9534a"/>
  <path d="M74 38 h52 M80 14 q20 -6 40 0" stroke="#d4a944" stroke-width="2" fill="none" opacity="0.7"/>`;

const OVERALLS = `
  <path d="M70 182 h60 v14 a14 14 0 0 1 -14 14 h-32 a14 14 0 0 1 -14 -14z" fill="#4b6cb7"/>
  <path d="M74 182 L66 140 M126 182 L134 140" stroke="#4b6cb7" stroke-width="7" stroke-linecap="round"/>
  <circle cx="76" cy="184" r="3" fill="#ffc857"/><circle cx="124" cy="184" r="3" fill="#ffc857"/>
  <rect x="90" y="190" width="20" height="12" rx="3" fill="#3d5ba0"/>`;

export const SPROCKET = {
  ...BLOOP,
  id: 'sprocket',
  name: 'Farmer Sprocket',
  svg: (uid) => {
    let svg = BLOOP.svg(uid)
      .replace('character-bloop', 'character-sprocket')
      .replace('Bloop, a friendly blue robot', 'Farmer Sprocket, a friendly farming robot with a straw hat');
    for (const [from, to] of PAINT) svg = svg.split(from).join(to);
    svg = svg.replace('<!-- Neck -->', `${OVERALLS}\n    <!-- Neck -->`);
    // Straw hat sits on the head; it lives in the antenna group so it wobbles.
    svg = svg.replace('<g data-part="antenna">', `<g data-part="antenna">${HAT}`);
    return svg;
  },
};
