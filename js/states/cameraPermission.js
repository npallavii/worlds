// Explains the camera before asking for it, requests it only on a tap, and turns every
// failure into a friendly message with a way forward (try again, or play without camera).
import { mountScreen, focusScreen } from '../ui/screen.js';
import { worldScene } from '../ui/scenery.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { pose, POSE_ERRORS } from '../core/pose/PoseService.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld } from '../data/worlds.js';

export function cameraPermissionState(app) {
  let bloop = null;

  return {
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      if (!world) { go(STATES.HUB); return; }

      const el = mountScreen(`screen-camera world-${world.id}`, `
        <div class="intro-backdrop" aria-hidden="true">${worldScene(world.id)}</div>
        <div class="intro-veil" aria-hidden="true"></div>
        <header class="top-bar">
          <button class="btn btn-soft" data-action="back">${icon('back')} Back</button>
          <div class="top-bar-right">
            <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
          </div>
        </header>

        <div class="intro-body">
          <article class="intro-card camera-card" style="--accent:${world.accent}" aria-live="polite">
            <div data-view="ask">
              <div class="camera-hero" aria-hidden="true">${icon('camera')}</div>
              <h1 class="intro-title">Let's turn on the camera</h1>
              <ul class="camera-points">
                <li>${icon('body')}<span>The camera helps Bloop see you move.</span></li>
                <li>${icon('lock')}<span><strong>Nothing is recorded or sent anywhere.</strong> It all stays on this device.</span></li>
                <li>${icon('lean')}<span>Find a clear space and stand about <strong>two big steps</strong> back.</span></li>
              </ul>
              <p class="camera-adult">Grown-ups: your browser will ask for permission. Choose <strong>Allow</strong>.</p>
              <div class="intro-actions">
                <button class="btn btn-primary btn-lg" data-action="camera" data-autofocus>${icon('camera')} Turn on camera</button>
                <button class="btn btn-soft" data-action="sim">${icon('hand')} Play without camera</button>
              </div>
            </div>

            <div data-view="busy" hidden>
              <div class="camera-spinner" aria-hidden="true"></div>
              <h1 class="intro-title" data-busy-title>Waking up the camera…</h1>
              <p class="intro-tagline" data-busy-sub>Look for the permission box at the top of the screen.</p>
            </div>

            <div data-view="error" hidden>
              <div class="camera-hero is-error" aria-hidden="true">${icon('camera')}</div>
              <h1 class="intro-title" data-error-title></h1>
              <p class="intro-tagline" data-error-body></p>
              <div class="intro-actions">
                <button class="btn btn-primary" data-action="camera">Try again</button>
                <button class="btn btn-soft" data-action="sim">${icon('hand')} Play without camera</button>
              </div>
            </div>
          </article>
          <div class="intro-guide"><div class="intro-bloop" data-bloop></div></div>
        </div>`);

      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      focusScreen(el);
      bloop.say("To play, I need to see you move! Let's turn on the camera together.");

      const show = (view) => el.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== view; });

      const startCamera = async () => {
        show('busy');
        audio.stopSpeech();
        bloop.playAnimation('walk');
        try {
          await pose.startCamera({
            onProgress: (stage) => {
              if (signal.aborted || stage !== 'model') return;
              el.querySelector('[data-busy-title]').textContent = 'Loading the body tracker…';
              el.querySelector('[data-busy-sub]').textContent = 'This takes a few seconds the first time.';
            },
          });
          if (signal.aborted) return;
          audio.sfx('chime');
          go(STATES.CALIBRATION, { worldId: world.id });
        } catch (err) {
          if (signal.aborted) return;
          const info = POSE_ERRORS[err.code] ?? POSE_ERRORS.inUse;
          console.warn('[camera]', err.code, err.cause ?? err);
          el.querySelector('[data-error-title]').textContent = info.title;
          el.querySelector('[data-error-body]').textContent = info.body;
          show('error');
          el.querySelector('[data-view="error"] [data-action="camera"]').focus();
          bloop.playAnimation('encourage');
          bloop.say("That's okay! We can try again, or play with the mouse.");
        }
      };

      el.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        audio.sfx('tap');
        if (action === 'back') go(STATES.WORLD_INTRO, { worldId: world.id });
        if (action === 'settings') app.openSettings();
        if (action === 'camera') startCamera();
        if (action === 'sim') {
          pose.startSimulation();
          go(STATES.CALIBRATION, { worldId: world.id });
        }
      }, { signal });
    },
    exit() {
      audio.stopSpeech();
      bloop?.destroy();
      bloop = null;
    },
  };
}
