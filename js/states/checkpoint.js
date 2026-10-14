// Learning checkpoint: one picture question before the reward.
// Wrong answers are teaching moments — first a clue, then the answer is shown and explained.
// Nobody gets stuck and nothing is taken away.
import { mountScreen, focusScreen } from '../ui/screen.js';
import { worldScene } from '../ui/scenery.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { guideFor } from '../characters/guides.js';
import { audio } from '../core/audio.js';
import { recordMetrics } from '../core/progress.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld } from '../data/worlds.js';

export function checkpointState(app) {
  let guide = null;

  return {
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      const q = params.result?.question;
      if (!world || !q) { go(STATES.HUB); return; }

      const el = mountScreen(`screen-check world-${world.id}`, `
        <div class="intro-backdrop" aria-hidden="true">${worldScene(world.id)}</div>
        <div class="intro-veil check-veil" aria-hidden="true"></div>
        <header class="top-bar">
          <span></span>
          <div class="top-bar-right">
            <button class="icon-btn" data-action="replay" aria-label="Hear the question again">${icon('speaker')}</button>
            <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
          </div>
        </header>
        <div class="check-body">
          <section class="check-card" style="--accent:${world.accent}" aria-labelledby="check-q">
            <p class="intro-kicker">Learning checkpoint</p>
            <h1 id="check-q" class="check-q">${q.prompt}</h1>
            <div class="check-options" role="group" aria-label="Answers">
              ${q.options.map((o) => `
                <button class="check-option" data-answer="${o.id}">
                  <span class="check-art">${o.art}</span>
                  <span class="check-label">${o.label}</span>
                </button>`).join('')}
            </div>
            <p class="check-feedback" data-feedback aria-live="polite"></p>
            <div class="check-actions"><button class="btn btn-primary btn-lg" data-action="continue" hidden>${icon('star')} Get my reward</button></div>
          </section>
          <div class="check-guide"><div class="check-character" data-guide></div></div>
        </div>`);

      guide = createCharacter(guideFor(world.id), el.querySelector('[data-guide]'));
      focusScreen(el);
      recordMetrics(world.id, { questionsAsked: 1 });
      guide.say(`Quiz time! ${q.prompt}`);

      const feedback = el.querySelector('[data-feedback]');
      const continueBtn = el.querySelector('[data-action="continue"]');
      let wrong = 0;
      let done = false;

      const finish = () => {
        done = true;
        el.querySelectorAll('.check-option').forEach((b) => { b.disabled = true; });
        continueBtn.hidden = false;
        continueBtn.focus();
      };

      el.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
          const action = actionEl.dataset.action;
          audio.sfx('tap');
          if (action === 'settings') app.openSettings();
          if (action === 'replay') guide.say(q.prompt);
          if (action === 'continue') go(STATES.VICTORY, { worldId: world.id, result: params.result, firstTry: wrong === 0 });
          return;
        }
        const btn = e.target.closest('.check-option');
        if (!btn || done || btn.disabled) return;

        if (btn.dataset.answer === q.answer) {
          btn.classList.add('is-correct');
          audio.sfx('chime');
          if (wrong === 0) recordMetrics(world.id, { questionsCorrectFirstTry: 1 });
          feedback.textContent = q.explain;
          guide.playAnimation('celebrate');
          guide.say(q.explain);
          finish();
          return;
        }

        wrong += 1;
        btn.classList.add('is-wrong');
        btn.disabled = true;
        audio.sfx('soft');
        guide.playAnimation('encourage');
        recordMetrics(world.id, { hints: 1 });
        if (wrong === 1) {
          feedback.textContent = `Good guess! Here's a clue: ${q.hint}`;
          guide.say(`Good guess! Here's a clue. ${q.hint}`);
        } else {
          const right = el.querySelector(`[data-answer="${q.answer}"]`);
          right.classList.add('is-correct', 'is-revealed');
          feedback.textContent = q.explain;
          guide.say(`Let's look together. ${q.explain}`);
          finish();
        }
      }, { signal });
    },
    exit() {
      audio.stopSpeech();
      guide?.destroy();
      guide = null;
    },
  };
}
