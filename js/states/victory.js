// Victory & rewards: characters celebrate, coins and badge are claimed (once per world),
// and the discovery cards are shown. The camera is already off at this point.
import { mountScreen, focusScreen } from '../ui/screen.js';
import { worldScene } from '../ui/scenery.js';
import { icon } from '../ui/icons.js';
import { celebrate, clearConfetti } from '../ui/confetti.js';
import { createCharacter } from '../characters/CharacterController.js';
import { guideFor } from '../characters/guides.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { claimWorldReward, getProgress, recordMetrics, REWARD_POLICY } from '../core/progress.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld } from '../data/worlds.js';

/** 3 stars: every activity done and the quiz right first time; 2: most done; 1: finished. */
function starsFor(result, firstTry) {
  const { done = 0, total = 1 } = result?.score ?? {};
  if (done === total && firstTry) return 3;
  if (done >= Math.ceil(total * 0.66)) return 2;
  return 1;
}

export function victoryState() {
  let chars = [];
  let timers = [];

  return {
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      const result = params.result;
      if (!world || !result) { go(STATES.HUB); return; }

      const coinsBefore = getProgress().coins;
      const stars = starsFor(result, params.firstTry);
      const granted = claimWorldReward(world.id, stars);
      recordMetrics(world.id, { completions: 1 });
      const coinsAfter = getProgress().coins;
      const newCards = new Set(result.newDiscoveries ?? []);

      const el = mountScreen(`screen-victory world-${world.id}`, `
        <div class="intro-backdrop victory-backdrop" aria-hidden="true">${worldScene(world.id)}</div>
        <div class="victory-glow" aria-hidden="true"></div>
        <div class="victory-body">
          <div class="victory-char" data-guide></div>
          <section class="victory-card" style="--accent:${world.accent}" aria-labelledby="victory-title">
            <div class="victory-stars" aria-label="${stars} of 3 stars">
              ${[1, 2, 3].map((n) => `<span class="${n <= stars ? 'on' : ''}" style="--i:${n}">${icon('star')}</span>`).join('')}
            </div>
            <h1 id="victory-title" class="victory-title">${world.shortName} complete!</h1>
            <div class="reward-row">
              <div class="reward coin-reward">
                <span class="reward-icon">${icon('coin')}</span>
                <span><b data-coins>${coinsBefore}</b><small>${granted ? `+${granted} energy coins` : 'coins already collected'}</small></span>
              </div>
              <div class="reward badge-reward">
                <span class="reward-icon">${icon('badge')}</span>
                <span><b>${world.badge}</b><small>${granted ? 'New badge!' : 'Badge earned'}</small></span>
              </div>
            </div>
            ${granted ? '' : `<p class="victory-note">You already earned the ${REWARD_POLICY.coinsPerWorld} coins for this world. Playing again is great practice!</p>`}
            <h2 class="victory-sub">Discovery cards</h2>
            <ul class="card-strip">
              ${(result.learned ?? []).map((c, i) => `
                <li class="mini-card" style="--i:${i}">
                  <span class="mini-art">${c.art}</span>
                  <b>${c.title}</b><small>${c.sub}</small>
                  ${newCards.has(c.id) ? '<span class="new-tag">New!</span>' : ''}
                </li>`).join('')}
            </ul>
            <button class="btn btn-primary btn-lg" data-action="continue" data-autofocus>${icon('play')} Continue</button>
          </section>
          <div class="victory-char" data-bloop></div>
        </div>`);

      const guide = createCharacter(guideFor(world.id), el.querySelector('[data-guide]'));
      const bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      chars = [guide, bloop];
      focusScreen(el);

      audio.sfx('sparkle');
      celebrate();
      guide.playAnimation('celebrate');
      timers.push(setTimeout(() => bloop.playAnimation('celebrate'), 300));
      guide.say(granted
        ? `Hooray! You finished the ${world.shortName}! You earned ${granted} energy coins and the ${world.badge} badge!`
        : `Hooray! You finished the ${world.shortName} again! Super practising!`);

      // Count the coins up so the reward feels earned.
      if (granted) {
        const coinsEl = el.querySelector('[data-coins]');
        let shown = coinsBefore;
        const step = () => {
          if (signal.aborted) return;
          shown = Math.min(coinsAfter, shown + 1);
          coinsEl.textContent = String(shown);
          if (shown % 4 === 0) audio.sfx('coin');
          if (shown < coinsAfter) timers.push(setTimeout(step, 70));
        };
        timers.push(setTimeout(step, 900));
      }

      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="continue"]')) {
          audio.sfx('tap');
          go(STATES.WORLD_COMPLETE, { worldId: world.id, result, stars, granted, firstTry: !!params.firstTry });
        }
      }, { signal });
    },
    exit() {
      timers.forEach(clearTimeout);
      timers = [];
      clearConfetti();
      audio.stopSpeech();
      chars.forEach((c) => c.destroy());
      chars = [];
    },
  };
}
