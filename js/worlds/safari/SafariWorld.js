// World 1 — Safari Emotion Expedition.
//
// Each round: Leo introduces an animal and its feeling → demonstrates the pose →
// the child dances while music plays → music stops: FREEZE in the animal pose and hold it →
// the animal is discovered (name, sound, feeling, fact). After all rounds, the gameplay host
// moves on to the learning checkpoint with the question this world builds.
//
// Implements the shared world interface:
//   initialize() · start() · update(dt, frame) · render() · pause() · resume() · destroy()
//
// Adaptive rules (deterministic, explained in docs/ARCHITECTURE.md):
//   • Level 1/2/3 sets the hold time: 2 s / 2.5 s / 3 s.
//   • A missed freeze → Leo shows the move again and the retry hold time drops by 0.5 s (min 1.2 s).
//   • Two misses on one animal → a "Skip" button appears; a third miss moves on kindly.
//   • End of session: all animals first try → level +1; two or more misses in total → level −1.
import { createCharacter } from '../../characters/CharacterController.js';
import { LEO } from '../../characters/leo.js';
import { audio } from '../../core/audio.js';
import { POSES, MotionMeter } from '../../core/pose/poseDetectors.js';
import { ISSUE_HINTS } from '../../core/pose/PoseService.js';
import { recordMetrics, addDiscoveries, getWorldProgress, setWorldLevel } from '../../core/progress.js';
import { stageMarkup, mountStage } from '../../ui/poseStage.js';
import { worldScene } from '../../ui/scenery.js';
import { posePictogram } from '../../ui/posePictogram.js';
import { fitCanvas } from '../../ui/poseOverlay.js';
import { icon } from '../../ui/icons.js';
import { ANIMALS, animalArt, getAnimal } from './animals.js';

const HOLD_BY_LEVEL = [2, 2.5, 3];
const GRACE = 0.35;           // brief wobbles don't reset a hold
const FREEZE_WINDOW = 14;     // seconds to find and hold the pose
const DANCE_RANGE = [6, 9];   // seconds of music before each freeze (first try)
const DANCE_RETRY = 4;        // shorter dance before a retry
const LOST_PAUSE = 1;         // seconds out of frame before the round pauses
const MIN_RETRY_HOLD = 1.2;

export function createWorld(ctx) { return new SafariWorld(ctx); }

class SafariWorld {
  #root; #config; #onComplete;
  #el = {};
  #leo = null;
  #stage = null;
  #meter = new MotionMeter();
  #particles = [];

  #round = 0;
  #phase = 'idle';
  #phaseT = 0;
  #speaking = false;
  #lastLine = null;          // re-spoken if a pause interrupted it
  #danceFor = 0;
  #danceCheered = false;
  #held = 0; #grace = 0;
  #holdTarget = 2;
  #misses = 0;               // misses on the current animal
  #lost = 0; #back = 0; #resumePhase = null; #danceLeft = 0;
  #startedAt = 0;
  #stats = [];               // per animal: { id, misses, success }

  constructor({ root, config, onComplete }) {
    this.#root = root;
    this.#config = config;
    this.#onComplete = onComplete;
  }

  get #animal() { return ANIMALS[this.#round]; }

  /* ---------------- Interface ---------------- */

  async initialize() {
    const level = getWorldProgress('safari')?.level ?? 1;
    this.#holdTarget = HOLD_BY_LEVEL[Math.min(3, Math.max(1, level)) - 1];

    this.#root.innerHTML = `
      <div class="safari">
        <div class="safari-scene" aria-hidden="true">${worldScene('safari')}</div>
        <svg class="safari-grass" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120 Q200 70 420 110 T860 100 T1300 110 T1600 90 V200 H0Z" fill="#e39a45"/>
          <path d="M0 160 Q300 120 640 150 T1260 140 T1600 150 V200 H0Z" fill="#cf8435"/>
        </svg>
        <canvas class="safari-fx" aria-hidden="true"></canvas>

        <div class="safari-leo" data-leo></div>
        <div class="safari-animal" data-animal></div>

        <div class="safari-rounds" aria-label="Animals">
          ${ANIMALS.map((a, i) => `<span class="round-dot" data-dot="${i}" title="${a.name}">${icon('star')}</span>`).join('')}
        </div>
        <div class="safari-banner" data-banner aria-live="assertive"></div>

        <div class="safari-meter" data-meter hidden>
          <span class="meter-note">${icon('music')}</span>
          <span class="meter-track"><span class="meter-fill" data-meter-fill></span></span>
          <span class="meter-label" data-meter-label>Dance!</span>
        </div>

        <div class="safari-target" data-target hidden>
          <span class="target-ring" data-ring style="--p:0">${posePictogram('armsUp')}</span>
          <span class="target-copy"><strong data-target-title></strong><span data-target-sub></span></span>
        </div>

        <article class="discovery-card" data-card hidden>
          <div class="discovery-art" data-card-art></div>
          <div class="discovery-copy">
            <p class="discovery-kicker">New discovery!</p>
            <h2 data-card-name></h2>
            <p class="discovery-feeling">Feels <strong data-card-emotion></strong></p>
            <p class="discovery-fact" data-card-fact></p>
            <div class="discovery-actions">
              <button class="btn btn-soft" data-action="sound">${icon('speaker')} Animal sound</button>
              <button class="btn btn-primary" data-action="next" hidden>Next ${icon('play')}</button>
            </div>
          </div>
        </article>

        <div class="safari-help" data-help hidden>
          <button class="btn btn-soft" data-action="skip">Skip this animal</button>
        </div>

        <div class="game-pip">${stageMarkup()}</div>
      </div>`;

    const q = (s) => this.#root.querySelector(s);
    this.#el = {
      animal: q('[data-animal]'), banner: q('[data-banner]'),
      meter: q('[data-meter]'), meterFill: q('[data-meter-fill]'), meterLabel: q('[data-meter-label]'),
      target: q('[data-target]'), ring: q('[data-ring]'), targetTitle: q('[data-target-title]'), targetSub: q('[data-target-sub]'),
      card: q('[data-card]'), cardArt: q('[data-card-art]'), cardName: q('[data-card-name]'),
      cardEmotion: q('[data-card-emotion]'), cardFact: q('[data-card-fact]'), next: q('[data-action="next"]'),
      help: q('[data-help]'), fx: q('.safari-fx'),
      dots: [...this.#root.querySelectorAll('[data-dot]')],
    };
    this.#leo = createCharacter(LEO, q('[data-leo]'));
    this.#stage = mountStage(this.#root);

    this.#root.addEventListener('click', this.#onClick);
  }

  start() {
    this.#startedAt = performance.now();
    recordMetrics('safari', { sessions: 1 });
    this.#stats = ANIMALS.map((a) => ({ id: a.id, misses: 0, success: false }));
    this.#startRound(0);
  }

  update(dt, frame) {
    this.#phaseT += dt;
    this.#stage.render(frame);
    this.#updateParticles(dt);

    // Tracking dropped out during an active phase: pause the round and help the child come back.
    if (this.#phase === 'dance' || this.#phase === 'freeze') {
      if (!frame?.inFrame) {
        this.#lost += dt;
        this.#stage.hint(this.#lost > 0.5 ? (frame?.issue ?? 'noPerson') : null);
        if (this.#lost > LOST_PAUSE) this.#pauseForTracking(frame?.issue ?? 'noPerson');
        return;
      }
      this.#lost = 0;
      this.#stage.hint(null);
    }

    switch (this.#phase) {
      case 'intro':
        if (!this.#speaking && this.#phaseT > 2.4) this.#enterDemo();
        break;
      case 'demo':
        if (!this.#speaking && this.#phaseT > 3.2) this.#enterDance(this.#misses ? DANCE_RETRY : rand(...DANCE_RANGE));
        break;
      case 'dance': this.#updateDance(dt, frame); break;
      case 'freeze': this.#updateFreeze(dt, frame); break;
      case 'tracking': {
        const ok = frame?.inFrame;
        this.#stage.hint(ok ? null : (frame?.issue ?? 'noPerson'));
        this.#back = ok ? this.#back + dt : 0;
        if (this.#back > 0.8) this.#resumeFromTracking();
        break;
      }
      case 'reveal':
        if (this.#phaseT > 2) this.#el.next.hidden = false;
        if (!this.#speaking && this.#phaseT > 5.5) this.#nextRound();
        break;
      default: break;
    }
  }

  render() {
    const { ctx, w, h } = fitCanvas(this.#el.fx);
    ctx.clearRect(0, 0, w, h);
    for (const p of this.#particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x * w, p.y * h);
      ctx.rotate(p.rot);
      if (p.kind === 'note') {
        ctx.font = `${p.size}px "Baloo 2", sans-serif`;
        ctx.fillText('♪', 0, 0);
      } else {
        star(ctx, p.size);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  pause() {
    audio.stopBeat();
  }

  resume() {
    if (this.#phase === 'dance') audio.startBeat();
    if (this.#lastLine?.interrupted) this.#say(this.#lastLine.text);
  }

  destroy() {
    this.#root.removeEventListener('click', this.#onClick);
    audio.stopBeat();
    audio.stopSpeech();
    this.#stage?.detach();
    this.#leo?.destroy();
    this.#leo = null;
    this.#root.innerHTML = '';
  }

  /* ---------------- Round flow ---------------- */

  #setPhase(name) { this.#phase = name; this.#phaseT = 0; }

  #say(text) {
    const line = { text, interrupted: false };
    this.#lastLine = line;
    this.#speaking = true;
    this.#leo.say(text).then((r) => {
      if (this.#lastLine === line) { this.#speaking = false; line.interrupted = r === 'interrupted'; }
    });
  }

  #banner(text, tone = '') {
    const b = this.#el.banner;
    b.textContent = text;
    b.className = `safari-banner ${tone}`;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  }

  #startRound(i) {
    this.#round = i;
    this.#misses = 0;
    this.#held = 0;
    const a = this.#animal;
    this.#el.dots.forEach((d, j) => d.classList.toggle('is-current', j === i));
    this.#el.card.hidden = true;
    this.#el.help.hidden = true;
    this.#el.animal.className = 'safari-animal is-entering';
    this.#el.animal.innerHTML = animalArt(a.id);
    this.#banner(`Animal ${i + 1}: ${a.name}`, 'is-soft');
    this.#setPhase('intro');
    this.#leo.playAnimation('wave');
    this.#say(a.intro);
  }

  #enterDemo() {
    const a = this.#animal;
    this.#setPhase('demo');
    this.#el.animal.className = 'safari-animal is-posed';
    this.#leo.playAnimation('demonstrate', { move: a.pose });
    this.#banner('Watch Leo!', 'is-soft');
    this.#say(this.#misses ? `Let's try again. ${a.tip}` : `When the music stops, freeze in the ${a.name.toLowerCase()} pose. Like this!`);
  }

  #enterDance(seconds) {
    this.#setPhase('dance');
    this.#danceFor = seconds;
    this.#danceCheered = false;
    this.#meter.reset();
    this.#el.animal.className = 'safari-animal is-dancing';
    this.#el.meter.hidden = false;
    this.#el.target.hidden = true;
    this.#banner('Dance, dance, dance!', 'is-dance');
    audio.stopSpeech();
    audio.startBeat();
    this.#leo.playAnimation('walk');
  }

  #updateDance(dt, frame) {
    const energy = this.#meter.update(frame);
    this.#el.meterFill.style.width = `${Math.round(energy * 100)}%`;
    if (energy > 0.25 && Math.random() < dt * 6) this.#spawn('note', 0.15 + Math.random() * 0.25, 0.85);
    if (!this.#danceCheered && energy > 0.45 && this.#phaseT > 1.5) {
      this.#danceCheered = true;
      this.#el.meterLabel.textContent = 'Great dancing!';
      audio.sfx('sparkle');
    }
    if (this.#phaseT >= this.#danceFor) this.#enterFreeze();
  }

  #enterFreeze() {
    const a = this.#animal;
    this.#setPhase('freeze');
    audio.stopBeat();
    audio.sfx('freeze');
    recordMetrics('safari', { poseAttempts: 1 });
    this.#held = 0; this.#grace = 0;
    this.#el.meter.hidden = true;
    this.#el.meterLabel.textContent = 'Dance!';
    this.#el.animal.className = 'safari-animal is-posed';
    this.#el.ring.innerHTML = posePictogram(a.pose);
    this.#el.ring.style.setProperty('--p', 0);
    this.#el.targetTitle.textContent = `Be a ${a.emotion} ${a.name.toLowerCase()}!`;
    this.#el.targetSub.textContent = 'Freeze and hold it…';
    this.#el.target.hidden = false;
    this.#banner('FREEZE!', 'is-freeze');
    this.#leo.playAnimation('demonstrate', { move: a.pose });
    this.#say(a.cue);
  }

  #updateFreeze(dt, frame) {
    const a = this.#animal;
    const hold = this.#misses ? Math.max(MIN_RETRY_HOLD, this.#holdTarget - 0.5 * this.#misses) : this.#holdTarget;
    const r = POSES[a.pose](frame.landmarks);
    if (r.match) {
      this.#held += dt; this.#grace = 0;
      this.#el.targetSub.textContent = 'Hold it… hold it…';
    } else {
      this.#grace += dt;
      if (this.#grace > GRACE) this.#held = Math.max(0, this.#held - dt * 1.5);
      if (this.#held === 0) this.#el.targetSub.textContent = r.score > 0.5 ? 'Almost! A little more…' : 'Freeze and hold it…';
    }
    this.#el.ring.style.setProperty('--p', Math.min(1, this.#held / hold).toFixed(3));
    if (this.#held >= hold) { this.#succeed(); return; }
    if (this.#phaseT > FREEZE_WINDOW) this.#miss();
  }

  #succeed() {
    const a = this.#animal;
    this.#stats[this.#round].success = true;
    recordMetrics('safari', { poseSuccesses: 1 });
    this.#el.target.hidden = true;
    this.#el.help.hidden = true;
    this.#el.dots[this.#round].classList.add('is-done');
    for (let i = 0; i < 26; i++) this.#spawn('star', 0.5 + (Math.random() - 0.5) * 0.3, 0.45 + (Math.random() - 0.5) * 0.2, true);
    audio.sfx('chime');
    setTimeout(() => audio.animal(a.id), 450);
    this.#leo.playAnimation('celebrate');
    this.#banner('You did it!', 'is-win');
    this.#reveal(`Wow! You were a ${a.emotion} ${a.name.toLowerCase()}! ${a.feeling} Did you know? ${a.fact}`);
  }

  #miss() {
    const a = this.#animal;
    this.#misses += 1;
    this.#stats[this.#round].misses += 1;
    recordMetrics('safari', { hints: 1 });
    this.#el.target.hidden = true;
    this.#leo.playAnimation('encourage');
    if (this.#misses >= 3) {
      // Never stuck: move on kindly and still learn about the animal.
      this.#banner("Let's learn about this one!", 'is-soft');
      this.#reveal(`That one is tricky! We'll practise it again another time. ${a.feeling} Did you know? ${a.fact}`);
      return;
    }
    if (this.#misses >= 2) this.#el.help.hidden = false;
    this.#banner('Good try!', 'is-soft');
    this.#setPhase('intro'); // short pause for Leo's encouragement, then demo again
    this.#say(`Good try! You're doing great.`);
  }

  #reveal(line) {
    const a = this.#animal;
    this.#setPhase('reveal');
    this.#el.next.hidden = true;
    this.#el.cardArt.innerHTML = animalArt(a.id);
    this.#el.cardName.textContent = `${a.character} the ${a.name}`;
    this.#el.cardEmotion.textContent = a.emotion;
    this.#el.cardFact.textContent = a.fact;
    this.#el.card.hidden = false;
    this.#el.animal.className = 'safari-animal is-happy';
    this.#say(line);
  }

  #nextRound() {
    if (this.#round + 1 < ANIMALS.length) { this.#startRound(this.#round + 1); return; }
    this.#finish();
  }

  #finish() {
    this.#setPhase('done');
    this.#el.card.hidden = true;
    const seconds = Math.round((performance.now() - this.#startedAt) / 1000);
    recordMetrics('safari', { secondsPlayed: seconds });
    const newCards = addDiscoveries(ANIMALS.map((a) => `safari:${a.id}`));

    // Explainable difficulty update for next time.
    const totalMisses = this.#stats.reduce((s, x) => s + x.misses, 0);
    const level = getWorldProgress('safari')?.level ?? 1;
    const nextLevel = totalMisses === 0 ? Math.min(3, level + 1) : totalMisses >= 2 ? Math.max(1, level - 1) : level;
    setWorldLevel('safari', nextLevel);

    this.#onComplete({
      stats: this.#stats,
      seconds,
      newDiscoveries: newCards,
      level: { from: level, to: nextLevel },
      question: buildQuestion(this.#stats),
      // What the summary screen shows under "What you learned".
      learned: ANIMALS.map((a) => ({ id: `safari:${a.id}`, art: animalArt(a.id), title: a.name, sub: `feels ${a.emotion}` })),
      // How the round went, as one line per activity for the summary.
      score: { done: this.#stats.filter((s) => s.success).length, total: ANIMALS.length, label: 'animal poses held' },
    });
  }

  #pauseForTracking(issue) {
    this.#resumePhase = this.#phase;
    this.#danceLeft = this.#danceFor - this.#phaseT;
    this.#setPhase('tracking');
    this.#back = 0;
    audio.stopBeat();
    this.#el.meter.hidden = true;
    this.#banner('Paused — come back into the picture!', 'is-soft');
    this.#say(ISSUE_HINTS[issue]);
  }

  #resumeFromTracking() {
    const prev = this.#resumePhase;
    this.#lost = 0;
    if (prev === 'dance') {
      this.#enterDance(Math.max(3, this.#danceLeft));
    } else {
      this.#enterFreeze();
      recordMetrics('safari', { poseAttempts: -1 }); // same attempt, resumed — don't double count
    }
  }

  #onClick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'sound') audio.animal(this.#animal.id);
    if (action === 'next' && this.#phase === 'reveal') { audio.sfx('tap'); this.#nextRound(); }
    if (action === 'skip' && (this.#phase === 'freeze' || this.#phase === 'dance' || this.#phase === 'demo' || this.#phase === 'intro')) {
      audio.sfx('tap');
      audio.stopBeat();
      this.#el.help.hidden = true;
      this.#el.target.hidden = true;
      this.#el.meter.hidden = true;
      this.#banner("Let's learn about this one!", 'is-soft');
      this.#reveal(`No problem! ${this.#animal.feeling} Did you know? ${this.#animal.fact}`);
    }
  };

  /* ---------------- Effects ---------------- */

  #spawn(kind, x, y, burst = false) {
    if (this.#particles.length > 120) return;
    const colors = ['#ffc857', '#ff8a65', '#7fd8be', '#b8a9e8', '#fff3c4'];
    this.#particles.push({
      kind, x, y,
      vx: burst ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.04,
      vy: burst ? -Math.random() * 0.45 - 0.1 : -0.12 - Math.random() * 0.08,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 3,
      size: kind === 'note' ? 26 + Math.random() * 14 : 7 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1, decay: burst ? 0.7 : 0.45,
    });
  }

  #updateParticles(dt) {
    for (const p of this.#particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'star') p.vy += 0.5 * dt;
      p.life -= p.decay * dt;
    }
    this.#particles = this.#particles.filter((p) => p.life > 0);
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Learning checkpoint question. Rule (deterministic): ask about the animal the child found
 * hardest this session (most misses); if there's a tie, the most recent one.
 */
function buildQuestion(stats) {
  const target = [...stats].reverse().reduce((best, s) => (s.misses > best.misses ? s : best));
  const a = getAnimal(target.id);
  return {
    prompt: a.question.prompt,
    hint: a.question.hint,
    answer: a.id,
    explain: `Yes! It's the ${a.name.toLowerCase()}. ${a.fact}`,
    options: ANIMALS.map((x) => ({ id: x.id, label: x.name, art: animalArt(x.id) })),
  };
}
