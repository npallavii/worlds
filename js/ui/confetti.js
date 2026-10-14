// Gentle celebration confetti (canvas-confetti, loaded on first use).
// Skipped entirely with reduced motion; if the CDN is unreachable the game simply goes on.
import { getSettings } from '../core/settings.js';

const SRC = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js';
let loading = null;

function load() {
  if (window.confetti) return Promise.resolve(window.confetti);
  loading ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(window.confetti ?? null);
    s.onerror = () => { loading = null; resolve(null); };
    document.head.appendChild(s);
  });
  return loading;
}

export async function celebrate() {
  if (getSettings().reducedMotion) return;
  const confetti = await load();
  if (!confetti) return;
  const colors = ['#ffc857', '#ff8a65', '#7fd8be', '#b8a9e8', '#9fd8f5'];
  const base = { particleCount: 60, spread: 70, startVelocity: 38, gravity: 0.9, ticks: 220, scalar: 1.1, colors, disableForReducedMotion: true };
  confetti({ ...base, origin: { x: 0.2, y: 0.7 }, angle: 60 });
  confetti({ ...base, origin: { x: 0.8, y: 0.7 }, angle: 120 });
  setTimeout(() => confetti({ ...base, particleCount: 40, origin: { x: 0.5, y: 0.5 }, spread: 100 }), 450);
}

export function clearConfetti() {
  window.confetti?.reset?.();
}
