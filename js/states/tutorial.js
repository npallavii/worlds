// Practice: Bloop demonstrates a move, the child copies it and holds it.
// Mistakes are never punished — after a while Bloop encourages, gives a tip, and offers to skip.
// If tracking drops out, the challenge pauses until the child is back in frame.
import { mountScreen, focusScreen } from '../ui/screen.js';
import { stageMarkup, mountStage } from '../ui/poseStage.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { addTask, isPaused } from '../core/scheduler.js';
import { pose, ISSUE_HINTS } from '../core/pose/PoseService.js';
import { POSES, POSE_LABELS } from '../core/pose/poseDetectors.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld } from '../data/worlds.js';

const HOLD_SECONDS = 2;      // how long to hold each pose
const GRACE_SECONDS = 0.35;  // brief wobbles don't reset the hold
const HELP_AFTER = 12;       // seconds before Bloop offers a tip + skip

const MOVES = {
  armsUp: { icon: 'body', say: 'Copy me! Reach both arms up high, like a giraffe!', tip: 'Try lifting your hands higher than your head.' },
  armsWide: { icon: 'row', say: 'Now stretch your arms out wide, like a bird!', tip: 'Stretch your arms out to the sides, nice and long.' },
  balance: { icon: 'lean', say: 'Can you lift one knee a little, like a flamingo?', tip: 'Just lift one knee a tiny bit. Hold on to a chair if you need to.' },
};

export function tutorialState(app) {
  let bloop = null;
  let stage = null;

  return {
    pausable: true,
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      if (!world) { go(STATES.HUB); return; }
      if (!pose.isActive) { go(STATES.CAMERA_PERMISSION, { worldId: world.id }); return; }

      const order = [world.demoMove, ...Object.keys(MOVES).filter((m) => m !== world.demoMove)].slice(0, world.practiceMoves ?? 3);

      const el = mountScreen(`screen-track world-${world.id}`, `
        <header class="top-bar">
          <button class="btn btn-soft" data-action="back">${icon('back')} Back</button>
          <div class="top-bar-right">
            <button class="icon-btn" data-action="pause" aria-label="Pause">${icon('pause')}</button>
            <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
          </div>
        </header>
        <div class="track-body">
          ${stageMarkup()}
          <aside class="track-panel" style="--accent:${world.accent}">
            <div class="track-bloop" data-bloop></div>
            <div data-view="play">
              <p class="intro-kicker">Practice · move <span data-count>1</span> of ${order.length}</p>
              <h1 class="track-title" data-move-label></h1>
              <div class="hold-meter" role="progressbar" aria-label="Hold the pose" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <span class="hold-ring" style="--p:0"><span data-move-icon></span></span>
                <span class="hold-text" data-hold-text>Watch Bloop first…</span>
              </div>
              <div class="practice-stars" aria-label="Moves done">${order.map(() => `<i>${icon('star')}</i>`).join('')}</div>
              <div class="track-actions">
                <button class="btn btn-soft" data-action="show">${icon('body')} Show me again</button>
                <button class="btn btn-soft" data-action="skip" hidden>Skip this one</button>
                ${world.playable ? `<button class="btn btn-soft" data-action="play">Skip practice ${icon('play')}</button>` : ''}
              </div>
            </div>
            <div data-view="done" hidden>
              <h1 class="track-title">You're a moving star!</h1>
              <p class="intro-tagline">${world.playable
                ? 'Your body is warmed up. Let\'s play!'
                : `You practised every move. The ${world.name} game opens in the next update!`}</p>
              <div class="track-actions">
                ${world.playable ? `<button class="btn btn-primary btn-lg" data-action="play">${icon('play')} Start the game</button>` : ''}
                <button class="btn ${world.playable ? 'btn-soft' : 'btn-primary'}" data-action="hub">${icon('back')} Back to the map</button>
                <button class="btn btn-soft" data-action="again">Practise again</button>
              </div>
            </div>
          </aside>
        </div>`);

      stage = mountStage(el);
      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      focusScreen(el);

      const $ = (s) => el.querySelector(s);
      const ring = $('.hold-ring');
      const meter = $('.hold-meter');
      const holdText = $('[data-hold-text]');
      const skipBtn = $('[data-action="skip"]');
      const stars = [...el.querySelectorAll('.practice-stars i')];

      let index = 0;
      let phase = 'demo';     // demo | try | success | reposition | done
      let held = 0, grace = 0, tryTime = 0, helped = false, lostFor = 0, backFor = 0;
      let timers = [];
      // Delayed steps wait while the game is paused, so nothing talks over the pause screen.
      const later = (ms, fn) => timers.push(setTimeout(() => {
        if (signal.aborted) return;
        if (isPaused()) later(300, fn); else fn();
      }, ms));

      const setHold = (p) => {
        ring.style.setProperty('--p', Math.min(1, p).toFixed(3));
        meter.setAttribute('aria-valuenow', String(Math.round(Math.min(1, p) * 100)));
      };

      const startMove = () => {
        const move = order[index];
        phase = 'demo';
        held = 0; grace = 0; tryTime = 0; helped = false;
        skipBtn.hidden = true;
        setHold(0);
        $('[data-count]').textContent = String(index + 1);
        $('[data-move-label]').textContent = POSE_LABELS[move];
        $('[data-move-icon]').innerHTML = icon(MOVES[move].icon);
        holdText.textContent = 'Watch Bloop first…';
        bloop.playAnimation('demonstrate', { move });
        audio.speak(MOVES[move].say, { speaker: 'Bloop' });
        later(3800, () => { phase = 'try'; holdText.textContent = 'Your turn! Copy the move.'; });
      };

      const succeed = () => {
        phase = 'success';
        stars[index].classList.add('on');
        audio.sfx('chime');
        bloop.playAnimation('happy');
        bloop.say(['Amazing!', 'Wow, great job!', 'You did it!'][index % 3]);
        holdText.textContent = 'Brilliant!';
        later(1900, () => {
          index += 1;
          if (index < order.length) startMove(); else finishAll();
        });
      };

      const finishAll = () => {
        phase = 'done';
        el.querySelector('[data-view="play"]').hidden = true;
        el.querySelector('[data-view="done"]').hidden = false;
        audio.sfx('sparkle');
        bloop.playAnimation('celebrate');
        bloop.say(world.playable ? "You're all warmed up. Let's play!" : 'You are a moving star! Great practising!');
        el.querySelector('[data-view="done"] .btn').focus();
      };

      startMove();

      const remove = addTask('tutorial', (dt) => {
        const f = pose.latest;
        stage.render(f, { good: f?.inFrame });
        if (phase === 'done' || phase === 'success') return;

        // Low confidence / out of frame: pause the challenge and help the child reposition.
        if (!f?.inFrame) {
          lostFor += dt; backFor = 0;
          if (lostFor > 1 && phase !== 'reposition' && phase !== 'demo') {
            phase = 'reposition';
            holdText.textContent = 'Paused — come back into the picture!';
            bloop.say(ISSUE_HINTS[f?.issue ?? 'noPerson']);
          }
          stage.hint(lostFor > 0.5 ? (f?.issue ?? 'noPerson') : null);
          return;
        }
        lostFor = 0;
        stage.hint(null);
        if (phase === 'reposition') {
          backFor += dt;
          if (backFor > 0.8) { phase = 'try'; holdText.textContent = 'Welcome back! Copy the move.'; }
          return;
        }
        if (phase !== 'try') return;

        tryTime += dt;
        const result = POSES[order[index]](f.landmarks);
        if (result.match) {
          held += dt; grace = 0;
          holdText.textContent = 'Hold it… hold it…';
        } else {
          grace += dt;
          if (grace > GRACE_SECONDS) held = Math.max(0, held - dt * 1.5);
          if (held === 0) holdText.textContent = result.score > 0.5 ? 'Almost! A little more…' : 'Your turn! Copy the move.';
        }
        setHold(held / HOLD_SECONDS);
        if (held >= HOLD_SECONDS) { succeed(); return; }

        if (!helped && tryTime > HELP_AFTER) {
          helped = true;
          skipBtn.hidden = false;
          bloop.playAnimation('encourage');
          bloop.say(`You're doing great! ${MOVES[order[index]].tip}`);
        }
      });

      signal.addEventListener('abort', () => { remove(); timers.forEach(clearTimeout); }, { once: true });

      el.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        audio.sfx('tap');
        if (action === 'back') go(STATES.WORLD_INTRO, { worldId: world.id });
        if (action === 'pause') app.pause();
        if (action === 'settings') app.openSettings();
        if (action === 'show' && phase !== 'success') {
          timers.forEach(clearTimeout); timers = [];
          startMove();
        }
        if (action === 'skip' && phase === 'try') {
          index += 1;
          if (index < order.length) startMove(); else finishAll();
        }
        if (action === 'again') go(STATES.TUTORIAL, { worldId: world.id });
        if (action === 'hub') go(STATES.HUB);
        if (action === 'play' && world.playable) go(STATES.GAMEPLAY, { worldId: world.id });
      }, { signal });
    },
    exit() {
      audio.stopSpeech();
      stage?.detach();
      stage = null;
      bloop?.destroy();
      bloop = null;
    },
  };
}
