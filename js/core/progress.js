// Demo progress: coins, per-world completion, reward claims, discoveries, learning metrics
// and difficulty level. Everything persists in localStorage.
//
// Rewards are keyed by world id and only granted once (see claimWorldReward), so replaying
// a world or reloading the page can never re-award coins.
import { readJSON, writeJSON, remove } from './storage.js';
import { WORLDS } from '../data/worlds.js';

const SCHEMA_VERSION = 1;
export const REWARD_POLICY = Object.freeze({ coinsPerWorld: 20 });

const freshMetrics = () => ({
  sessions: 0,            // times an activity was started
  completions: 0,         // times it was finished
  poseAttempts: 0,        // freeze/hold challenges started
  poseSuccesses: 0,       // challenges held successfully
  questionsAsked: 0,
  questionsCorrectFirstTry: 0,
  hints: 0,               // hints given or requested
  secondsPlayed: 0,
  lastPlayed: null,
});

const freshWorld = () => ({ completed: false, stars: 0, rewardClaimed: false, level: 1, metrics: freshMetrics() });

function fresh() {
  return {
    version: SCHEMA_VERSION,
    coins: 0,
    worlds: Object.fromEntries(WORLDS.map((w) => [w.id, freshWorld()])),
    badges: [],
    discoveries: [],      // collectible discovery cards, e.g. 'safari:giraffe'
    chestOpened: false,
  };
}

function load() {
  const saved = readJSON('progress', null);
  if (!saved || saved.version !== SCHEMA_VERSION) return fresh();
  const base = fresh();
  // Merge field-by-field so saves from earlier builds gain new fields with defaults.
  const worlds = Object.fromEntries(WORLDS.map((w) => {
    const s = saved.worlds?.[w.id] ?? {};
    return [w.id, { ...freshWorld(), ...s, metrics: { ...freshMetrics(), ...s.metrics } }];
  }));
  return { ...base, ...saved, worlds };
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
export const getWorldProgress = (worldId) => structuredClone(progress.worlds[worldId]);

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

/** Adds to a world's counters, e.g. recordMetrics('safari', { poseAttempts: 1 }). */
export function recordMetrics(worldId, deltas) {
  const m = progress.worlds[worldId]?.metrics;
  if (!m) return;
  for (const [k, v] of Object.entries(deltas)) if (typeof m[k] === 'number') m[k] += v;
  m.lastPlayed = new Date().toISOString();
  commit();
}

/** Adds discovery cards; returns the ids that are new. */
export function addDiscoveries(ids) {
  const added = ids.filter((id) => !progress.discoveries.includes(id));
  if (added.length) { progress.discoveries.push(...added); commit(); }
  return added;
}

export function setWorldLevel(worldId, level) {
  const w = progress.worlds[worldId];
  if (!w || w.level === level) return;
  w.level = level;
  commit();
}

export function resetProgress() {
  remove('progress');
  progress = fresh();
  commit();
}
