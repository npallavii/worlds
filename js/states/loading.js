import { mountScreen } from '../ui/screen.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { STATES } from '../core/stateMachine.js';

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((r) => setTimeout(r, ms))]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function loadingState() {
  let bloop = null;

  return {
    async enter({ go, signal }) {
      const el = mountScreen('screen-loading', `
        <div class="loading-wrap">
          <div class="loading-bloop" data-bloop></div>
          <h1 class="loading-title">Active Play Worlds</h1>
          <div class="progress-track" role="progressbar" aria-label="Loading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="progress-fill"></div>
          </div>
          <p class="loading-tip" aria-live="polite">Warming up Bloop's circuits…</p>
        </div>`);
      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      bloop.playAnimation('walk');

      const bar = el.querySelector('.progress-track');
      const tip = el.querySelector('.loading-tip');
      const setProgress = (pct, text) => {
        bar.setAttribute('aria-valuenow', String(pct));
        bar.firstElementChild.style.width = `${pct}%`;
        if (text) tip.textContent = text;
      };

      // Real loading work for Milestone 1: web fonts. Later milestones add pose-model warm-up here.
      setProgress(20);
      await withTimeout(document.fonts?.ready ?? Promise.resolve(), 3000);
      setProgress(70, 'Painting the worlds…');
      await wait(450);
      setProgress(100, 'Ready!');
      await wait(450);
      if (!signal.aborted) go(STATES.WELCOME);
    },
    exit() {
      bloop?.destroy();
      bloop = null;
    },
  };
}
