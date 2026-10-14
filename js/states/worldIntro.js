import { mountScreen, focusScreen } from '../ui/screen.js';
import { worldScene } from '../ui/scenery.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld, WORLDS } from '../data/worlds.js';

export function worldIntroState(app) {
  let bloop = null;

  return {
    pausable: true,
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      if (!world) { go(STATES.HUB); return; }
      const index = WORLDS.indexOf(world);

      const el = mountScreen(`screen-intro world-${world.id}`, `
        <div class="intro-backdrop" aria-hidden="true">${worldScene(world.id)}</div>
        <div class="intro-veil" aria-hidden="true"></div>
        <header class="top-bar">
          <button class="btn btn-soft" data-action="back">${icon('back')} Map</button>
          <div class="top-bar-right">
            <button class="icon-btn" data-action="pause" aria-label="Pause">${icon('pause')}</button>
            <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
          </div>
        </header>

        <div class="intro-body">
          <article class="intro-card" style="--accent:${world.accent}">
            <p class="intro-kicker">World ${index + 1} · Guide: ${world.guide.name}</p>
            <h1 class="intro-title">${world.name}</h1>
            <p class="intro-tagline">${world.tagline}</p>
            <div class="card-chips">${world.skills.map((s) => `<span class="chip">${s}</span>`).join('')}</div>

            <h2 class="intro-sub">How to play</h2>
            <ol class="intro-steps">
              ${world.steps.map((s, i) => `<li style="--i:${i}"><span class="step-ico">${icon(s.icon)}</span><span>${s.text}</span></li>`).join('')}
            </ol>

            <div class="intro-actions">
              <button class="btn btn-primary" data-action="start" ${world.playable ? '' : 'disabled aria-describedby="intro-soon"'}>
                ${icon('play')} Start
              </button>
              <button class="btn btn-soft" data-action="demo">${icon('body')} Show me the move</button>
              <button class="icon-btn" data-action="replay" aria-label="Hear it again" title="Hear it again">${icon('speaker')}</button>
            </div>
            ${world.playable ? '' : `<p id="intro-soon" class="intro-soon">This world's game is being built next. For now, meet Bloop and practise the move!</p>`}
          </article>

          <div class="intro-guide"><div class="intro-bloop" data-bloop></div></div>
        </div>`);

      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      focusScreen(el);

      const narrate = () => bloop.say(`Welcome to ${world.name}! ${world.intro}`);
      bloop.playAnimation('walk');
      const t = setTimeout(() => {
        bloop.playAnimation('point', { side: 'left' }).then((r) => { if (r === 'done' && !signal.aborted) narrate(); });
      }, 900);
      signal.addEventListener('abort', () => clearTimeout(t), { once: true });

      el.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        audio.sfx('tap');
        if (action === 'back') go(STATES.HUB);
        if (action === 'settings') app.openSettings();
        if (action === 'pause') app.pause();
        if (action === 'replay') narrate();
        if (action === 'demo') {
          audio.stopSpeech();
          bloop.playAnimation('demonstrate', { move: world.demoMove }).then((r) => {
            if (r === 'done' && !signal.aborted) {
              bloop.playAnimation('happy');
              audio.sfx('chime');
            }
          });
        }
        if (action === 'start' && world.playable) go(STATES.CAMERA_PERMISSION, { worldId: world.id });
      }, { signal });
    },
    exit() {
      audio.stopSpeech();
      bloop?.destroy();
      bloop = null;
    },
  };
}
