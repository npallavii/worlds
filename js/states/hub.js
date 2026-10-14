import { mountScreen, focusScreen } from '../ui/screen.js';
import { hubSceneLayers, worldScene } from '../ui/scenery.js';
import { attachParallax } from '../ui/parallax.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { getProgress, completedCount } from '../core/progress.js';
import { STATES } from '../core/stateMachine.js';
import { WORLDS } from '../data/worlds.js';

const TAP_REACTIONS = ['happy', 'wave', 'celebrate'];

function worldCard(world, index, saved) {
  const status = saved.completed
    ? `<span class="card-status is-done">${icon('star')} Done</span>`
    : index === 0 ? '<span class="card-status">Start here</span>' : '';
  return `
    <li>
      <button class="world-card" data-world="${world.id}" style="--accent:${world.accent}; --tint-a:${world.tint[0]}; --tint-b:${world.tint[1]}; --i:${index}"
        aria-label="World ${index + 1}: ${world.name}. ${world.tagline}${saved.completed ? ' Completed.' : ''}">
        <span class="card-art">${worldScene(world.id)}<span class="card-num">${index + 1}</span>${status}</span>
        <span class="card-body">
          <span class="card-head">
            <span class="card-title">${world.name}</span>
            <span class="card-go" aria-hidden="true">${icon('play')}</span>
          </span>
          <span class="card-chips">${world.skills.map((s) => `<span class="chip">${s}</span>`).join('')}</span>
        </span>
      </button>
    </li>`;
}

export function hubState(app) {
  let bloop = null;
  let greeted = false;

  return {
    enter({ go, signal, params }) {
      const progress = getProgress();
      const done = completedCount();

      const el = mountScreen('screen-hub', `
        <div class="scene-layers" aria-hidden="true">${hubSceneLayers()}</div>
        <header class="top-bar">
          <div class="brand">${icon('star', 'brand-star')}<span>Active Play Worlds</span></div>
          <div class="top-bar-right">
            <span class="pill" title="Energy coins">${icon('coin', 'pill-coin')}<b>${progress.coins}</b><span class="sr-only"> energy coins</span></span>
            <span class="pill" title="World badges">${icon('badge', 'pill-badge')}<b>${done}/${WORLDS.length}</b><span class="sr-only"> badges</span></span>
            <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
          </div>
        </header>

        <div class="hub-body">
          <aside class="hub-guide">
            <button class="bloop-hit" data-action="poke" aria-label="Say hi to Bloop">
              <span class="hub-bloop" data-bloop></span>
            </button>
          </aside>

          <section class="hub-map" aria-labelledby="hub-title">
            <h1 id="hub-title" class="hub-title">Choose your adventure</h1>
            <ul class="world-grid" role="list">
              ${WORLDS.map((w, i) => worldCard(w, i, progress.worlds[w.id])).join('')}
            </ul>
            <div class="chest-strip" aria-label="Treasure chest: ${done} of ${WORLDS.length} worlds complete">
              <span class="chest-icon">${icon('chest')}</span>
              <span class="chest-text"><strong>Treasure chest</strong> Finish all five worlds to open it!</span>
              <span class="chest-dots" aria-hidden="true">
                ${WORLDS.map((w) => `<i class="${progress.worlds[w.id].completed ? 'on' : ''}"></i>`).join('')}
              </span>
              <span class="chest-lock">${icon('lock')}</span>
            </div>
          </section>
        </div>`);

      attachParallax(el.querySelector('.scene-layers'), { signal, id: 'hub' });
      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      focusScreen(el);

      // Greeting: first arrival from the welcome screen gets a full hello.
      const line = params.greet && !greeted
        ? "Hi, I'm Bloop! Pick a world, and let's learn by moving our bodies!"
        : 'Where shall we explore next?';
      greeted = true;
      bloop.playAnimation('wave').then((r) => { if (r === 'done' && !signal.aborted) bloop.say(line); });

      // Bloop points toward whichever world the child is considering.
      let lastPoint = 0;
      const pointAt = () => {
        const now = performance.now();
        if (now - lastPoint < 2500 || bloop.currentAnimation !== 'idle') return;
        lastPoint = now;
        bloop.playAnimation('point', { side: 'right' });
      };
      el.querySelectorAll('.world-card').forEach((card) => {
        card.addEventListener('pointerenter', pointAt, { signal });
        card.addEventListener('focus', pointAt, { signal });
      });

      el.addEventListener('click', (e) => {
        const card = e.target.closest('.world-card');
        if (card) {
          audio.sfx('whoosh');
          go(STATES.WORLD_INTRO, { worldId: card.dataset.world });
          return;
        }
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'settings') app.openSettings();
        if (action === 'poke') {
          audio.sfx('sparkle');
          bloop.playAnimation(TAP_REACTIONS[Math.floor(Math.random() * TAP_REACTIONS.length)]);
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
