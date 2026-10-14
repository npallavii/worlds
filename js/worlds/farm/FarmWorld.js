// World 2 — Phonics Farm.
//
// Farmer Sprocket shows a picture word (e.g. CAT) with empty letter slots. One target letter
// at a time: "Find C — C says kuh!". Clay pots float by, each painted with a letter. The child
// reaches out with either hand; touching the right pot breaks it and the letter flies into its
// slot. Touching another pot just wobbles it while Sprocket names that letter — a teaching
// moment, never a penalty. A complete word animates together and the farm animal appears.
//
// Hit testing: wrists → play space (body-relative reach box, see shared/bodyMapping.js),
// then distance to each pot's centre. A hand must leave a pot before it can touch it again,
// so one touch is counted once, not once per frame.
//
// Adaptive rules (deterministic):
//   • Level picks the word list (1: CAT/DOG/PIG/HEN, 2–3: FROG/DUCK…) and pot count (3, 3, 4)
//     and drift speed (slow → a little faster).
//   • After 2 wrong touches or 12 s without finding the letter, the right pot glows and
//     Sprocket repeats the sound slowly (a hint, counted in metrics).
//   • Session with no hints → level +1 next time; 4+ hints → level −1.
import { audio } from '../../core/audio.js';
import { recordMetrics, addDiscoveries, getWorldProgress, setWorldLevel } from '../../core/progress.js';
import { SPROCKET } from '../../characters/sprocket.js';
import { worldScene } from '../../ui/scenery.js';
import { WorldShell } from '../shared/WorldShell.js';
import { reachPoints } from '../shared/bodyMapping.js';
import { WORDS_BY_LEVEL, LETTER_SOUNDS, DISTRACTORS, ANIMALS, animalArt, letterArt } from './farmData.js';

const WORDS_PER_SESSION = 2;
const HINT_AFTER_SECONDS = 12;
const POT_R = 0.062;       // pot radius as a fraction of the screen height
const HAND_R = 0.05;
const POTS_BY_LEVEL = [3, 3, 4];
const SPEED_BY_LEVEL = [0.035, 0.045, 0.055];

export function createWorld(ctx) { return new FarmWorld(ctx); }

class FarmWorld {
  #root; #onComplete; #shell;
  #level = 1;
  #words = [];
  #wordIndex = 0;
  #letterIndex = 0;
  #pots = [];
  #hands = [];
  #touching = new Set();     // `${side}:${potId}` pairs currently in contact
  #phase = 'idle'; #phaseT = 0;
  #seek = 0;                 // seconds spent looking for the current letter
  #wrongThisLetter = 0;
  #hinting = false;
  #stats = [];               // per word { word, wrong, hints }
  #startedAt = 0;
  #potId = 0;
  #slotsEl = null;
  #after = null;             // { at, fn }: a step that runs after a delay of game time (pauses with the game)
  #targetEl = null;

  constructor({ root, onComplete }) { this.#root = root; this.#onComplete = onComplete; }

  get #word() { return this.#words[this.#wordIndex]; }
  get #target() { return this.#word[this.#letterIndex]; }

  async initialize() {
    this.#level = Math.min(3, Math.max(1, getWorldProgress('farm')?.level ?? 1));
    const sessions = getWorldProgress('farm')?.metrics.sessions ?? 0;
    const list = WORDS_BY_LEVEL[this.#level - 1];
    this.#words = Array.from({ length: WORDS_PER_SESSION }, (_, i) => list[(sessions * WORDS_PER_SESSION + i) % list.length]);

    this.#shell = new WorldShell(this.#root, {
      id: 'farm',
      guideDef: SPROCKET,
      sceneHtml: worldScene('farm'),
      progressTotal: WORDS_PER_SESSION,
      progressIcon: 'letter',
      overlayHtml: `
        <div class="farm-board">
          <div class="farm-picture" data-picture></div>
          <div class="farm-slots" data-slots></div>
        </div>
        <div class="farm-target" data-target hidden></div>`,
    });
    this.#slotsEl = this.#shell.q('[data-slots]');
    this.#targetEl = this.#shell.q('[data-target]');
    this.#root.addEventListener('click', this.#onClick);
  }

  start() {
    this.#startedAt = performance.now();
    recordMetrics('farm', { sessions: 1 });
    this.#stats = this.#words.map((word) => ({ word, wrong: 0, hints: 0 }));
    this.#startWord(0);
  }

  update(dt, frame) {
    const s = this.#shell;
    this.#phaseT += dt;
    s.stage.render(frame);

    if (this.#phase === 'seek') {
      if (!s.tracking(frame, dt)) { this.#hands = []; return; }
      this.#hands = reachPoints(frame);
      this.#seek += dt;
      this.#movePots(dt);
      this.#hitTest();
      if (!this.#hinting && (this.#seek > HINT_AFTER_SECONDS || this.#wrongThisLetter >= 2)) this.#hint();
    } else {
      this.#hands = [];
      if (this.#after && this.#phaseT >= this.#after.at) { const fn = this.#after.fn; this.#after = null; fn(); }
      if (this.#phase === 'intro' && !s.speaking && this.#phaseT > 2) this.#startLetter();
      if (this.#phase === 'word' && this.#phaseT > 2.5) s.showCardNext();
      if (this.#phase === 'word' && !s.speaking && this.#phaseT > 6) this.#nextWord();
      this.#movePots(dt * 0.4);
    }
  }

  render(dt = 1 / 60) {
    const { ctx, w, h } = this.#shell.canvas();
    ctx.clearRect(0, 0, w, h);
    for (const pot of this.#pots) drawPot(ctx, pot, w, h, this.#hinting && pot.letter === this.#target && !pot.broken);
    for (const hand of this.#hands) drawHand(ctx, hand, w, h);
    this.#shell.renderFx(dt);
  }

  /** Read-only snapshot for automated tests (?debug). */
  debug() { return { phase: this.#phase, target: this.#phase === 'seek' ? this.#target : null, pots: this.#pots.map((p) => ({ x: p.x, y: p.y + Math.sin(p.bob) * 0.01, letter: p.letter, broken: p.broken })) }; }

  pause() {}
  resume() { this.#shell.resumeSpeech(); }

  destroy() {
    this.#root.removeEventListener('click', this.#onClick);
    this.#shell.destroy();
  }

  /* ---------------- Flow ---------------- */

  #setPhase(p) { this.#phase = p; this.#phaseT = 0; this.#after = null; }
  #wait(seconds, fn) { this.#setPhase('between'); this.#after = { at: seconds, fn }; }

  #startWord(i) {
    this.#wordIndex = i;
    this.#letterIndex = 0;
    const word = this.#word;
    const s = this.#shell;
    s.hideCard();
    s.progress(i, [...Array(i).keys()]);
    this.#shell.q('[data-picture]').innerHTML = animalArt(word);
    this.#slotsEl.innerHTML = [...word].map((_, j) => `<span class="farm-slot" data-slot="${j}"></span>`).join('');
    this.#slotsEl.classList.remove('is-complete');
    this.#pots = [];
    s.banner(`Word ${i + 1}: let's spell a farm animal!`, 'is-soft');
    s.guide.playAnimation('wave');
    s.say(`Let's spell the word for this animal. It has ${word.length} letters. Reach out and pop the pots!`);
    this.#setPhase('intro');
  }

  #startLetter() {
    const letter = this.#target;
    this.#seek = 0;
    this.#wrongThisLetter = 0;
    this.#hinting = false;
    this.#slotsEl.querySelectorAll('.farm-slot').forEach((el, j) => el.classList.toggle('is-next', j === this.#letterIndex));
    this.#targetEl.innerHTML = `<span class="farm-target-letter">${letter}</span><span><strong>Find the letter ${letter}</strong><small>${letter} says “${LETTER_SOUNDS[letter].split(',')[0]}”</small></span>`;
    this.#targetEl.hidden = false;
    this.#spawnPots(letter);
    this.#shell.banner(`Find ${letter}!`, 'is-dance');
    this.#shell.guide.playAnimation('point', { side: 'right' });
    this.#shell.say(`Find the letter ${letter}. ${letter} says ${LETTER_SOUNDS[letter]}.`);
    this.#setPhase('seek');
  }

  #spawnPots(target) {
    const count = POTS_BY_LEVEL[this.#level - 1];
    const word = this.#word;
    const pool = DISTRACTORS.filter((l) => l !== target && !word.includes(l));
    const letters = [target];
    while (letters.length < count) {
      const l = pool[Math.floor(Math.random() * pool.length)];
      if (!letters.includes(l)) letters.push(l);
    }
    letters.sort(() => Math.random() - 0.5);
    // Spread pots across reachable rows and columns; drift direction alternates by row.
    const rows = [0.48, 0.62, 0.54, 0.66];
    const speed = SPEED_BY_LEVEL[this.#level - 1];
    this.#pots = letters.map((letter, i) => ({
      id: ++this.#potId,
      letter,
      x: 0.26 + (i / Math.max(1, count - 1)) * 0.44,
      y: rows[i % rows.length],
      vx: (i % 2 ? -1 : 1) * speed,
      bob: Math.random() * Math.PI * 2,
      wobble: 0,
      pop: 0,         // entrance scale 0 → 1
      broken: false,
    }));
    this.#touching.clear();
  }

  #movePots(dt) {
    for (const p of this.#pots) {
      p.pop = Math.min(1, p.pop + dt * 2.5);
      p.bob += dt * 2;
      p.wobble = Math.max(0, p.wobble - dt * 2.5);
      if (p.broken) continue;
      p.x += p.vx * dt;
      // Bounce softly inside the play area (pots stay away from the guide and the camera mirror).
      if (p.x < 0.24) { p.x = 0.24; p.vx = Math.abs(p.vx); }
      if (p.x > 0.7) { p.x = 0.7; p.vx = -Math.abs(p.vx); }
    }
  }

  #hitTest() {
    const { w, h } = this.#shell.canvas();
    const aspect = w / h;
    for (const hand of this.#hands) {
      for (const pot of this.#pots) {
        if (pot.broken || pot.pop < 0.8) continue;
        const dx = (hand.x - pot.x) * aspect, dy = hand.y - (pot.y + Math.sin(pot.bob) * 0.01);
        const d = Math.hypot(dx, dy);
        const key = `${hand.side}:${pot.id}`;
        if (d < POT_R + HAND_R * 0.6) {
          if (!this.#touching.has(key)) { this.#touching.add(key); this.#touch(pot); }
        } else if (d > (POT_R + HAND_R) * 1.3) {
          this.#touching.delete(key);
        }
      }
    }
  }

  #touch(pot) {
    const s = this.#shell;
    if (pot.letter === this.#target) {
      pot.broken = true;
      audio.sfx('pop');
      s.burst(pot.x, pot.y, 20);
      for (let i = 0; i < 10; i++) s.particles.spawn('star', pot.x, pot.y, true, '#d98a5a');
      this.#placeLetter(pot);
      return;
    }
    // Wrong pot: wobble and name the letter — learning, not losing.
    pot.wobble = 1;
    this.#wrongThisLetter += 1;
    this.#stats[this.#wordIndex].wrong += 1;
    audio.sfx('soft');
    s.guide.playAnimation('encourage');
    s.say(`That's ${pot.letter}. ${pot.letter} says ${LETTER_SOUNDS[pot.letter]}. We need ${this.#target}.`);
  }

  #hint() {
    this.#hinting = true;
    this.#stats[this.#wordIndex].hints += 1;
    recordMetrics('farm', { hints: 1 });
    const letter = this.#target;
    this.#shell.banner(`Look for the glowing pot!`, 'is-soft');
    this.#shell.say(`Here's a clue. Look for the glowing pot. ${letter}… ${letter}… says ${LETTER_SOUNDS[letter].split(',')[0]}.`);
  }

  #placeLetter(pot) {
    const s = this.#shell;
    const slot = this.#slotsEl.querySelector(`[data-slot="${this.#letterIndex}"]`);
    // Fly a letter from the pot to its slot.
    const rect = s.root.getBoundingClientRect();
    const target = slot.getBoundingClientRect();
    const fly = document.createElement('span');
    fly.className = 'farm-fly';
    fly.textContent = pot.letter;
    fly.style.left = `${pot.x * rect.width}px`;
    fly.style.top = `${pot.y * rect.height}px`;
    s.root.appendChild(fly);
    requestAnimationFrame(() => {
      fly.style.left = `${target.left - rect.left + target.width / 2}px`;
      fly.style.top = `${target.top - rect.top + target.height / 2}px`;
      fly.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });
    setTimeout(() => {
      fly.remove();
      slot.textContent = pot.letter;
      slot.classList.add('is-filled');
    }, 650);

    recordMetrics('farm', { poseAttempts: 1, poseSuccesses: 1 });
    this.#letterIndex += 1;
    this.#targetEl.hidden = true;
    if (this.#letterIndex < this.#word.length) {
      s.banner('Great reaching!', 'is-win');
      s.say(`Yes! ${pot.letter}!`);
      this.#wait(1.8, () => this.#startLetter());
    } else {
      this.#wait(0.8, () => this.#completeWord());
    }
  }

  #completeWord() {
    const word = this.#word;
    const a = ANIMALS[word];
    const s = this.#shell;
    this.#slotsEl.classList.add('is-complete');
    this.#pots = [];
    audio.sfx('sparkle');
    s.burst(0.5, 0.25, 30);
    s.guide.playAnimation('celebrate');
    s.banner(`${word}!`, 'is-win');
    s.progress(this.#wordIndex, [...Array(this.#wordIndex + 1).keys()]);
    s.showCard({ art: animalArt(word), kicker: 'You spelled it!', name: `${[...word].join(' - ')} … ${word}!`, chip: `${word.length} letters`, fact: a.fact });
    s.say(`${[...word].join('. ')}. ${a.name}! You spelled ${a.name.toLowerCase()}! ${a.fact}`);
    this.#setPhase('word');
  }

  #nextWord() {
    if (this.#wordIndex + 1 < this.#words.length) { this.#startWord(this.#wordIndex + 1); return; }
    this.#finish();
  }

  #finish() {
    this.#setPhase('done');
    this.#shell.hideCard();
    const seconds = Math.round((performance.now() - this.#startedAt) / 1000);
    recordMetrics('farm', { secondsPlayed: seconds });
    const newCards = addDiscoveries(this.#words.map((w) => `farm:${w.toLowerCase()}`));
    const hints = this.#stats.reduce((n, x) => n + x.hints, 0);
    const level = this.#level;
    const next = hints === 0 ? Math.min(3, level + 1) : hints >= 4 ? Math.max(1, level - 1) : level;
    setWorldLevel('farm', next);

    // Quiz about the word that needed the most help (ties → the last word).
    const hardest = [...this.#stats].reverse().reduce((b, x) => (x.wrong + x.hints > b.wrong + b.hints ? x : b));
    const first = hardest.word[0];
    const options = [first, ...DISTRACTORS.filter((l) => l !== first && !hardest.word.includes(l)).slice(0, 8).sort(() => Math.random() - 0.5).slice(0, 2)]
      .sort(() => Math.random() - 0.5);

    this.#onComplete({
      stats: this.#stats,
      seconds,
      newDiscoveries: newCards,
      level: { from: level, to: next },
      score: { done: this.#stats.filter((x) => x.hints === 0).length, total: this.#stats.length, label: 'words spelled without a clue' },
      learned: this.#words.map((w) => ({ id: `farm:${w.toLowerCase()}`, art: animalArt(w), title: w, sub: `${w.length} letters` })),
      question: {
        prompt: `Which letter does ${hardest.word} start with?`,
        hint: `Say it slowly: ${hardest.word.toLowerCase()}. ${first} says ${LETTER_SOUNDS[first].split(',')[0]}.`,
        answer: first,
        explain: `Yes! ${hardest.word} starts with ${first}. ${first} says ${LETTER_SOUNDS[first].split(',')[0]}.`,
        options: options.map((l) => ({ id: l, label: `Letter ${l}`, art: letterArt(l) })),
      },
    });
  }

  #onClick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'card-next' && this.#phase === 'word') { audio.sfx('tap'); this.#nextWord(); }
  };
}

/* ---------------- Drawing ---------------- */

function drawPot(ctx, pot, w, h, glow) {
  const r = POT_R * h * (0.4 + 0.6 * easeOutBack(pot.pop));
  const x = pot.x * w;
  const y = (pot.y + Math.sin(pot.bob) * 0.01) * h;
  if (pot.broken) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(pot.wobble * 14) * pot.wobble * 0.3);
  if (glow) {
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 30 + Math.sin(performance.now() / 150) * 10;
  }
  // Clay pot body.
  ctx.fillStyle = '#d9885a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.55);
  ctx.lineTo(r * 0.95, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.9, r * 0.9, 0, r * 1.05);
  ctx.quadraticCurveTo(-r * 0.9, r * 0.9, -r * 0.95, -r * 0.55);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c26f42';
  roundRect(ctx, -r * 1.1, -r * 0.85, r * 2.2, r * 0.42, r * 0.15);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.1, r * 0.12, r * 0.35, 0.3, 0, Math.PI * 2); ctx.fill();
  // Letter.
  ctx.fillStyle = '#fffaf0';
  ctx.font = `800 ${Math.round(r * 1.05)}px "Baloo 2", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pot.letter, 0, r * 0.25);
  ctx.restore();
}

function drawHand(ctx, hand, w, h) {
  const x = hand.x * w, y = hand.y * h, r = HAND_R * h;
  ctx.save();
  ctx.fillStyle = hand.side === 'L' ? 'rgba(95,194,240,0.35)' : 'rgba(255,138,101,0.35)';
  ctx.strokeStyle = hand.side === 'L' ? '#2f8fc0' : '#e8684a';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
