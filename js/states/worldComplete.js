// World completion summary: what was learned, how it went, and where to go next.
import { mountScreen, focusScreen } from '../ui/screen.js';
import { worldScene } from '../ui/scenery.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { completedCount } from '../core/progress.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld, WORLDS } from '../data/worlds.js';

const LEVEL_NOTE = {
  up: 'Next time the poses are held a little longer, because every one was done first try.',
  down: 'Next time the poses are a little shorter to hold, to make them easier.',
  same: 'Next time the challenge stays the same.',
};

export function worldCompleteState() {
  let bloop = null;

  return {
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      const result = params.result;
      if (!world || !result) { go(STATES.HUB); return; }

      const index = WORLDS.indexOf(world);
      const next = WORLDS.slice(index + 1).concat(WORLDS.slice(0, index)).find((w) => w.id !== world.id);
      const done = completedCount();
      const minutes = Math.max(1, Math.round((result.seconds ?? 0) / 60));
      const lv = result.level ?? { from: 1, to: 1 };
      const levelNote = lv.to > lv.from ? LEVEL_NOTE.up : lv.to < lv.from ? LEVEL_NOTE.down : LEVEL_NOTE.same;

      const el = mountScreen(`screen-summary world-${world.id}`, `
        <div class="intro-backdrop" aria-hidden="true">${worldScene(world.id)}</div>
        <div class="intro-veil" aria-hidden="true"></div>
        <div class="intro-body">
          <article class="intro-card summary-card" style="--accent:${world.accent}">
            <p class="intro-kicker">${world.badge} badge · ${'★'.repeat(params.stars ?? 1)}${'☆'.repeat(3 - (params.stars ?? 1))}</p>
            <h1 class="intro-title">What you learned</h1>
            <ul class="learned-list">
              ${(result.learned ?? []).map((c) => `<li><span class="mini-art">${c.art}</span><span><b>${c.title}</b><small>${c.sub}</small></span></li>`).join('')}
            </ul>
            <ul class="summary-stats">
              <li>${icon('body')}<span><b>${result.score?.done ?? 0} of ${result.score?.total ?? 0}</b> ${result.score?.label ?? 'activities'}</span></li>
              <li>${icon('star')}<span>Quiz: <b>${params.firstTry ? 'right first time' : 'solved with a clue'}</b></span></li>
              <li>${icon('music')}<span>Played for about <b>${minutes} minute${minutes === 1 ? '' : 's'}</b></span></li>
              <li>${icon('chest')}<span>Treasure chest: <b>${done} of ${WORLDS.length}</b> worlds done</span></li>
            </ul>
            <p class="summary-adult"><strong>For grown-ups:</strong> ${levelNote}</p>
            <div class="intro-actions">
              <button class="btn btn-primary" data-action="next" data-autofocus>${icon('play')} Next: ${next.shortName}</button>
              <button class="btn btn-soft" data-action="again">Play again</button>
              <button class="btn btn-soft" data-action="hub">${icon('back')} Map</button>
            </div>
          </article>
          <div class="intro-guide"><div class="intro-bloop" data-bloop></div></div>
        </div>`);

      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      focusScreen(el);
      bloop.playAnimation('wave');
      bloop.say(`Look at everything you learned! Where shall we go next?`);

      el.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        audio.sfx('tap');
        if (action === 'next') go(STATES.WORLD_INTRO, { worldId: next.id });
        if (action === 'again') go(STATES.WORLD_INTRO, { worldId: world.id });
        if (action === 'hub') go(STATES.HUB);
      }, { signal });
    },
    exit() {
      audio.stopSpeech();
      bloop?.destroy();
      bloop = null;
    },
  };
}
