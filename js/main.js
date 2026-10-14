// App entry: wires the state machine, global controls (pause, settings) and the debug panel.
import { StateMachine, STATES } from './core/stateMachine.js';
import { applyToDocument, getSettings, updateSettings } from './core/settings.js';
import * as scheduler from './core/scheduler.js';
import { audio } from './core/audio.js';
import { CLIPS } from './characters/clips.js';
import { liveCharacters } from './characters/CharacterController.js';
import { loadingState } from './states/loading.js';
import { welcomeState } from './states/welcome.js';
import { hubState } from './states/hub.js';
import { worldIntroState } from './states/worldIntro.js';

applyToDocument();

const machine = new StateMachine();
const defs = new Map();
const overlay = document.getElementById('pause-overlay');
const settingsDialog = document.getElementById('settings-dialog');
let paused = false;

/* ---------------- Shared app actions (passed to states) ---------------- */

const app = {
  openSettings() {
    const form = settingsDialog.querySelector('form');
    const s = getSettings();
    for (const input of form.elements) {
      if (!input.name || !(input.name in s)) continue;
      if (input.type === 'checkbox') input.checked = s[input.name];
      else input.value = s[input.name];
    }
    settingsDialog.showModal();
  },

  pause() {
    if (paused || !defs.get(machine.current)?.pausable) return;
    paused = true;
    scheduler.setPaused(true);
    audio.stopSpeech();
    document.documentElement.classList.add('is-paused');
    overlay.hidden = false;
    overlay.querySelector('[data-action="resume"]').focus();
  },

  resume() {
    if (!paused) return;
    paused = false;
    scheduler.setPaused(false);
    document.documentElement.classList.remove('is-paused');
    overlay.hidden = true;
    audio.sfx('pop');
  },
};

/* ---------------- States ---------------- */
// Milestone 1 registers the states it implements. Later milestones register
// cameraPermission, calibration, tutorial, gameplay, checkpoint, victory, etc.
function register(name, def) {
  defs.set(name, def);
  machine.register(name, def);
}
register(STATES.LOADING, loadingState(app));
register(STATES.WELCOME, welcomeState(app));
register(STATES.HUB, hubState(app));
register(STATES.WORLD_INTRO, worldIntroState(app));

/* ---------------- Global controls ---------------- */

overlay.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'resume') app.resume();
  if (action === 'settings') app.openSettings();
  if (action === 'hub') { app.resume(); machine.go(STATES.HUB); }
});

settingsDialog.addEventListener('input', (e) => {
  const { name, type, checked, value } = e.target;
  if (!name) return;
  updateSettings({ [name]: type === 'checkbox' ? checked : Number(value) });
  if (type === 'checkbox') audio.sfx('tap');
});
settingsDialog.addEventListener('close', () => {
  if (paused) overlay.querySelector('[data-action="resume"]').focus();
});

document.addEventListener('keydown', (e) => {
  if (settingsDialog.open) return; // the dialog handles its own Escape
  if (e.key === 'Escape' && paused) { e.preventDefault(); app.resume(); return; }
  if ((e.key === 'p' || e.key === 'P') && !e.repeat) paused ? app.resume() : app.pause();
});

// Auto-pause when the tab is hidden during an activity.
document.addEventListener('visibilitychange', () => { if (document.hidden) app.pause(); });

/* ---------------- Debug panel (?debug) ---------------- */

if (new URLSearchParams(location.search).has('debug')) {
  const hud = document.getElementById('debug-hud');
  hud.hidden = false;
  const refresh = () => {
    const st = scheduler.stats();
    hud.textContent = [
      `state: ${machine.current}${paused ? ' (paused)' : ''}`,
      `rAF loop: ${st.looping ? 'running' : 'idle'} · tasks: ${st.tasks}`,
      ...st.ids.map((id) => `  · ${id}`),
      `characters alive: ${liveCharacters.size}`,
      `screens in DOM: ${document.querySelectorAll('#screen-root > .screen').length}`,
    ].join('\n');
  };
  setInterval(refresh, 400);

  const panel = document.createElement('div');
  panel.className = 'debug-anim';
  panel.setAttribute('aria-label', 'Animation test panel');
  panel.innerHTML = Object.keys(CLIPS).map((n) => `<button data-clip="${n}">${n}</button>`).join('')
    + '<button data-say="1">say()</button>';
  panel.addEventListener('click', (e) => {
    const clip = e.target.dataset.clip;
    for (const c of liveCharacters) {
      if (clip) c.playAnimation(clip, clip === 'point' ? { side: 'right' } : {});
      if (e.target.dataset.say) { audio.unlock(); c.say('Testing, testing! One, two, three.'); }
    }
  });
  document.body.appendChild(panel);
}

machine.go(STATES.LOADING);
