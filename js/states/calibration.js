// Calibration: (1) get the whole body in frame, (2) stand still with arms down so we can
// record the child's neutral position and size, (3) raise both arms to confirm tracking.
// The neutral measurements are what later worlds use for leaning and body-relative targets.
import { mountScreen, focusScreen } from '../ui/screen.js';
import { stageMarkup, mountStage } from '../ui/poseStage.js';
import { icon } from '../ui/icons.js';
import { createCharacter } from '../characters/CharacterController.js';
import { BLOOP } from '../characters/bloop.js';
import { audio } from '../core/audio.js';
import { addTask, isPaused } from '../core/scheduler.js';
import { pose, ISSUE_HINTS } from '../core/pose/PoseService.js';
import { POSES } from '../core/pose/poseDetectors.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld } from '../data/worlds.js';

const IN_FRAME_SECONDS = 1;
const STILL_SECONDS = 2;
const WAVE_SECONDS = 0.8;
const HINT_REPEAT_MS = 7000;

const STEPS = [
  { id: 'frame', label: 'Stand where Bloop can see all of you', say: "Stand in front of the camera so I can see you from your head to your knees." },
  { id: 'still', label: 'Stand still like a statue', say: 'Great! Now stand still like a statue, with your arms down.' },
  { id: 'wave', label: 'Reach both arms up high', say: 'Now reach both arms up high to say hello!' },
];

function averageMetrics(samples) {
  const n = samples.length;
  const avg = (get) => samples.reduce((s, m) => s + get(m), 0) / n;
  return {
    shoulderMid: { x: avg((m) => m.shoulderMid.x), y: avg((m) => m.shoulderMid.y) },
    hipMid: { x: avg((m) => m.hipMid.x), y: avg((m) => m.hipMid.y) },
    torsoMid: { x: avg((m) => m.torsoMid.x), y: avg((m) => m.torsoMid.y) },
    shoulderWidth: avg((m) => m.shoulderWidth),
  };
}

export function calibrationState(app) {
  let bloop = null;
  let stage = null;

  return {
    pausable: true,
    enter({ go, signal, params }) {
      const world = getWorld(params.worldId);
      if (!world) { go(STATES.HUB); return; }
      if (!pose.isActive) { go(STATES.CAMERA_PERMISSION, { worldId: world.id }); return; }

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
            <h1 class="track-title">Get ready to move!</h1>
            <ol class="calib-steps">
              ${STEPS.map((s, i) => `<li data-step="${s.id}" class="${i === 0 ? 'is-active' : ''}">
                <span class="calib-ring" style="--p:0"><b>${i + 1}</b></span><span>${s.label}</span></li>`).join('')}
            </ol>
            <div class="track-actions">
              ${pose.source === 'camera'
                ? `<button class="btn btn-soft" data-action="sim">${icon('hand')} Use mouse instead</button>`
                : `<button class="btn btn-soft" data-action="camera">${icon('camera')} Use camera instead</button>`}
            </div>
          </aside>
        </div>`);

      stage = mountStage(el);
      bloop = createCharacter(BLOOP, el.querySelector('[data-bloop]'));
      focusScreen(el);

      let step = 0;
      let timer = 0;          // seconds accumulated toward the current step
      let lostFor = 0;
      let samples = [];
      let prevTorso = null;
      let lastHintAt = 0;
      let issueSince = 0;
      let done = false;
      let finishTimer = null;

      const stepEls = STEPS.map((s) => el.querySelector(`[data-step="${s.id}"]`));
      const setProgress = (p) => stepEls[step]?.querySelector('.calib-ring').style.setProperty('--p', Math.min(1, p).toFixed(3));
      const enterStep = (i) => {
        step = i; timer = 0; samples = []; lostFor = 0;
        stepEls.forEach((li, j) => {
          li.classList.toggle('is-active', j === i);
          li.classList.toggle('is-done', j < i);
          if (j >= i) li.querySelector('.calib-ring').style.setProperty('--p', 0);
        });
        bloop.say(STEPS[i].say);
        lastHintAt = performance.now(); // don't talk over the step instruction
        if (STEPS[i].id === 'wave') bloop.playAnimation('demonstrate', { move: 'armsUp' });
      };
      enterStep(0);

      const finish = () => {
        done = true;
        stepEls.forEach((li) => { li.classList.remove('is-active'); li.classList.add('is-done'); });
        pose.calibration = { ...averageMetrics(samples), source: pose.source, at: Date.now() };
        audio.sfx('sparkle');
        bloop.playAnimation('celebrate');
        bloop.say("Hello! I can see you! Let's practise some moves.");
        const proceed = () => {
          if (signal.aborted) return;
          if (isPaused()) finishTimer = setTimeout(proceed, 300); else go(STATES.TUTORIAL, { worldId: world.id });
        };
        finishTimer = setTimeout(proceed, 3200);
      };

      const remove = addTask('calibration', (dt) => {
        const f = pose.latest;
        stage.render(f);
        if (done) return;

        // Repositioning hints (spoken at most every HINT_REPEAT_MS, after the issue persists).
        const now = performance.now();
        const issue = f?.issue ?? 'noPerson';
        if (stage.hint(f?.inFrame ? null : issue)) issueSince = now;
        if (!f?.inFrame && now - issueSince > 1500 && now - lastHintAt > HINT_REPEAT_MS) {
          lastHintAt = now;
          bloop.say(ISSUE_HINTS[issue]);
        }

        if (!f?.inFrame) {
          lostFor += dt;
          if (step > 0 && lostFor > 0.8) enterStep(0);
          timer = Math.max(0, timer - dt * 2);
          setProgress(timer / (step === 0 ? IN_FRAME_SECONDS : step === 1 ? STILL_SECONDS : WAVE_SECONDS));
          return;
        }
        lostFor = 0;
        const lm = f.landmarks;

        if (STEPS[step].id === 'frame') {
          timer += dt;
          setProgress(timer / IN_FRAME_SECONDS);
          if (timer >= IN_FRAME_SECONDS) { audio.sfx('pop'); enterStep(1); }
        } else if (STEPS[step].id === 'still') {
          const torso = f.metrics.torsoMid;
          const speed = prevTorso ? Math.hypot(torso.x - prevTorso.x, torso.y - prevTorso.y) / Math.max(dt, 1e-3) / f.metrics.shoulderWidth : 0;
          prevTorso = torso;
          const still = POSES.neutral(lm).match && speed < 1.2; // < 1.2 shoulder-widths per second
          if (still) { timer += dt; samples.push(f.metrics); } else { timer = Math.max(0, timer - dt * 1.5); }
          if (samples.length > 60) samples.shift();
          setProgress(timer / STILL_SECONDS);
          if (timer >= STILL_SECONDS) {
            const neutral = samples.slice();
            audio.sfx('pop');
            enterStep(2);
            samples = neutral; // keep neutral samples for the final calibration
          }
        } else if (STEPS[step].id === 'wave') {
          const up = POSES.armsUp(lm);
          timer = up.match ? timer + dt : Math.max(0, timer - dt);
          setProgress(timer / WAVE_SECONDS);
          if (timer >= WAVE_SECONDS) finish();
        }
      });

      signal.addEventListener('abort', () => { remove(); clearTimeout(finishTimer); }, { once: true });

      el.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        audio.sfx('tap');
        if (action === 'back') go(STATES.WORLD_INTRO, { worldId: world.id });
        if (action === 'pause') app.pause();
        if (action === 'settings') app.openSettings();
        if (action === 'sim') { pose.startSimulation(); go(STATES.CALIBRATION, { worldId: world.id }); }
        if (action === 'camera') go(STATES.CAMERA_PERMISSION, { worldId: world.id });
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
