import { mountScreen, focusScreen } from '../ui/screen.js';
import { hubSceneLayers } from '../ui/scenery.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { STATES } from '../core/stateMachine.js';

export function welcomeState(app) {
  let bloop = null;
  let timer = null;

  return {
    enter({ go, signal }) {
      const title = 'Active Play Worlds';
      let i = 0;
      const letters = title.split(' ').map((word) =>
        `<span class="title-word" aria-hidden="true">${[...word].map((ch) => `<span class="title-letter" style="--i:${i++}">${ch}</span>`).join('')}</span>`,
      ).join(' ');

      const el = mountScreen('screen-welcome', `
        <div class="scene-layers" aria-hidden="true">${hubSceneLayers()}</div>
        <div class="welcome-veil" aria-hidden="true"></div>
        <header class="top-bar">
          <span></span>
          <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
        </header>
        <div class="welcome-body">
          <div class="welcome-bloop" data-bloop></div>
          <div class="welcome-copy">
            <h1 class="welcome-title" aria-label="${title}">${letters}</h1>
            <p class="welcome-tagline">Move your body. Grow your brain.</p>
            <button class="btn btn-primary btn-lg welcome-play" data-action="play" data-autofocus>
              ${icon('play')} Let's play!
            </button>
            <p class="welcome-note">${icon('camera')} Uses your camera to see you move. Nothing is recorded or sent anywhere.</p>
          </div>
        </div>`);

      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      timer = setTimeout(() => bloop?.playAnimation('wave'), 700);
      focusScreen(el);

      el.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'settings') { audio.unlock(); app.openSettings(); }
        if (action === 'play') {
          audio.unlock();       // first user gesture → audio + speech allowed from here on
          audio.sfx('pop');
          go(STATES.HUB, { greet: true });
        }
      }, { signal });
    },
    exit() {
      clearTimeout(timer);
      bloop?.destroy();
      bloop = null;
    },
  };
}
