// Demo progress: coins, per-world completion and reward claims.
// Rewards are keyed by world id and only granted once (see claimWorldReward), so
// reloading the page can never re-award coins. Full metrics arrive in Milestone 5.
import { readJSON, writeJSON, remove } from './storage.js';
import { WORLDS } from '../data/worlds.js';

const SCHEMA_VERSION = 1;
export const REWARD_POLICY = Object.freeze({ coinsPerWorld: 20 });

function fresh() {
  return {
    version: SCHEMA_VERSION,
    coins: 0,
    worlds: Object.fromEntries(WORLDS.map((w) => [w.id, { completed: false, stars: 0, rewardClaimed: false }])),
    badges: [],
    chestOpened: false,
  };
}

function load() {
  const saved = readJSON('progress', null);
  if (!saved || saved.version !== SCHEMA_VERSION) return fresh();
  const base = fresh();
  return { ...base, ...saved, worlds: { ...base.worlds, ...saved.worlds } };
}

let progress = load();
const listeners = new Set();

function commit() {
  writeJSON('progress', progress);
  for (const fn of listeners) fn(getProgress());
}

export const getProgress = () => structuredClone(progress);
export const onProgressChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const completedCount = () => Object.values(progress.worlds).filter((w) => w.completed).length;
export const isChestUnlocked = () => completedCount() === WORLDS.length;

/** Marks a world complete and grants its coins exactly once. Returns coins granted (0 if already claimed). */
export function claimWorldReward(worldId, stars = 1) {
  const w = progress.worlds[worldId];
  if (!w) throw new Error(`Unknown world: ${worldId}`);
  w.completed = true;
  w.stars = Math.max(w.stars, stars);
  if (w.rewardClaimed) { commit(); return 0; }
  w.rewardClaimed = true;
  progress.coins += REWARD_POLICY.coinsPerWorld;
  if (!progress.badges.includes(worldId)) progress.badges.push(worldId);
  commit();
  return REWARD_POLICY.coinsPerWorld;
}

export function resetProgress() {
  remove('progress');
  progress = fresh();
  commit();
}
