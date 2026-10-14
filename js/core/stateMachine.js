// Central game-state controller.
//
// Each state is { enter(ctx), exit?() }. On every transition the previous state's
// AbortController is aborted, which removes every listener it registered with
// { signal: ctx.signal }, and its exit() hook stops timers / loops it owns.
// Transitions are queued so rapid taps can't interleave two enter() calls.

export const STATES = Object.freeze({
  LOADING: 'loading',
  WELCOME: 'welcome',
  HUB: 'hub',
  WORLD_INTRO: 'worldIntro',
  CAMERA_PERMISSION: 'cameraPermission',
  CALIBRATION: 'calibration',
  TUTORIAL: 'tutorial',
  GAMEPLAY: 'gameplay',
  CHECKPOINT: 'checkpoint',
  VICTORY: 'victory',
  WORLD_COMPLETE: 'worldComplete',
  TREASURE: 'treasure',
  PARENT_SUMMARY: 'parentSummary',
});

export class StateMachine {
  #states = new Map();
  #active = null; // { name, def, controller }
  #queue = Promise.resolve();
  #listeners = new Set();

  register(name, def) {
    this.#states.set(name, def);
    return this;
  }

  has(name) { return this.#states.has(name); }
  get current() { return this.#active?.name ?? null; }

  onChange(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  go(name, params = {}) {
    this.#queue = this.#queue.then(() => this.#transition(name, params)).catch((err) => {
      console.error(`[state] transition to "${name}" failed`, err);
    });
    return this.#queue;
  }

  async #transition(name, params) {
    const def = this.#states.get(name);
    if (!def) throw new Error(`State "${name}" is not registered`);

    const prev = this.#active;
    if (prev) {
      prev.controller.abort();
      await prev.def.exit?.();
    }

    const controller = new AbortController();
    this.#active = { name, def, controller };
    await def.enter({ params, signal: controller.signal, from: prev?.name ?? null, go: (n, p) => this.go(n, p) });
    for (const fn of this.#listeners) fn(name, prev?.name ?? null);
  }
}
