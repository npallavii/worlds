// The one and only requestAnimationFrame loop in the app.
// Characters, parallax and (later) world update/render steps register tasks here,
// so switching screens can never leave a stray loop running.

const tasks = new Map();
let rafId = null;
let last = 0;
let paused = false;

function frame(now) {
  rafId = null; // this frame is running; nothing is pending until we (or ensureRunning) schedule one
  // Clamp: never negative (rAF timestamps can precede a performance.now() taken mid-frame),
  // never a huge jump after the tab was hidden.
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  for (const [id, task] of tasks) {
    if (paused && !task.runWhilePaused) continue;
    try {
      task.fn(dt, now / 1000);
    } catch (err) {
      console.error(`[scheduler] task "${id}" failed and was removed`, err);
      tasks.delete(id);
    }
  }
  // A task may have removed every task and added new ones, which already scheduled the
  // next frame via ensureRunning — only schedule if nothing is pending, so there is never a second loop.
  if (rafId === null && tasks.size) rafId = requestAnimationFrame(frame);
}

function ensureRunning() {
  if (rafId === null && tasks.size) {
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
}

/** Register a per-frame task. Re-using an id replaces the old task. Returns a remover. */
export function addTask(id, fn, { runWhilePaused = false } = {}) {
  tasks.set(id, { fn, runWhilePaused });
  ensureRunning();
  return () => removeTask(id);
}

export function removeTask(id) {
  tasks.delete(id);
  if (!tasks.size && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function setPaused(value) { paused = value; }
export const isPaused = () => paused;
export const stats = () => ({ tasks: tasks.size, ids: [...tasks.keys()], looping: rafId !== null });
