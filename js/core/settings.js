// Accessibility & audio settings, persisted locally.
import { readJSON, writeJSON } from './storage.js';

const prefersReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULTS = Object.freeze({
  volume: 70,          // 0–100
  muted: false,
  voice: true,         // spoken instructions
  captions: true,
  music: false,        // off by default: quieter classroom demos
  reducedMotion: prefersReduced,
});

let state = { ...DEFAULTS, ...readJSON('settings', {}) };
const listeners = new Set();

export const getSettings = () => ({ ...state });

export function updateSettings(patch) {
  state = { ...state, ...patch };
  writeJSON('settings', state);
  applyToDocument();
  for (const fn of listeners) fn(getSettings(), patch);
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyToDocument() {
  document.documentElement.dataset.reducedMotion = String(state.reducedMotion);
}
