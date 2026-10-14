// World 3 — Magician's Shape Castle.
//
// Wren the wizard names a shape and shows a safe body pose for it (triangle: hands together
// over the head; square: "window" arms; star: arms up and out). A magic wall with that shape
// cut out of it glides toward the child. Make the shape and hold it before the wall arrives:
// the cut-out fills with light, the wall dissolves into sparkles and a portal opens. Then
// Wren teaches the shape's sides/corners and a real-world example.
//
// Poses are compared in shoulder widths from the child's own shoulders (tolerant, any size).
// No extreme stretches and no balancing are required.
//
// Adaptive rules (deterministic):
//   • Level 1/2/3: the wall takes 10 s / 8 s / 6.5 s to arrive. Hold time is 1.2 s.
//   • Wall arrives without the shape → it stops, Wren gives a tip, and it comes again 30%
//     slower. Two misses → a "Skip" button. Three → Wren teaches the shape anyway.
//   • Session with no misses → level +1 next time; two or more → level −1.
import { audio } from '../../core/audio.js';
import { POSES } from '../../core/pose/poseDetectors.js';
import { recordMetrics, addDiscoveries, getWorldProgress, setWorldLevel } from '../../core/progress.js';
import { WREN } from '../../characters/humanoid.js';
import { worldScene } from '../../ui/scenery.js';
import { posePictogram } from '../../ui/posePictogram.js';
import { WorldShell, starPath } from '../shared/WorldShell.js';
import { SHAPES, getShape, shapeArt, shapePath } from './shapes.js';

const APPROACH_BY_LEVEL = [10, 8, 6.5];
const HOLD = 1.2;
const GRACE = 0.35;

export function createWorld(ctx) { return new CastleWorld(ctx); }

class CastleWorld {
  #root; #onComplete; #shell;
  #level = 1;
  #round = 0;
  #phase = 'idle'; #phaseT = 0;
  #approach = 10;
  #wall = 0;                 // 0 = far away, 1 = arrived
  #held = 0; #grace = 0;
  #misses = 0;
  #dissolve = 0;
  #stats = [];
  #startedAt = 0;
  #targetEl = null; #ringEl = null; #targetSub = null;
  #path = null;

  constructor({ root, onComplete }) { this.#root = root; this.#onComplete = onComplete; }

  get #shape() { return SHAPES[this.#round]; }

  async initialize() {
    this.#level = Math.min(3, Math.max(1, getWorldProgress('castle')?.level ?? 1));
    this.#shell = new WorldShell(this.#root, {
      id: 'castle',
      guideDef: WREN,
      sceneHtml: worldScene('castle'),
      progressTotal: SHAPES.length,
      progressIcon: 'shape',
      overlayHtml: `
        <div class="safari-target castle-target" data-target hidden>
          <span class="target-ring" data-ring style="--p:0"></span>
          <span class="target-copy"><strong data-target-title></strong><span data-target-sub></span></span>
        </div>`,
    });
    this.#targetEl = this.#shell.q('[data-target]');
    this.#ringEl = this.#shell.q('[data-ring]');
    this.#targetSub = this.#shell.q('[data-target-sub]');
    this.#root.addEventListener('click', this.#onClick);
  }

  start() {
    this.#startedAt = performance.now();
    recordMetrics('castle', { sessions: 1 });
    this.#stats = SHAPES.map((s) => ({ id: s.id, misses: 0, success: false }));
    this.#startRound(0);
  }

  update(dt, frame) {
    const s = this.#shell;
    this.#phaseT += dt;
    s.stage.render(frame);

    switch (this.#phase) {
      case 'intro':
        if (!s.speaking && this.#phaseT > 3) this.#beginApproach();
        break;
      case 'approach': {
        if (!s.tracking(frame, dt)) return;
        this.#wall = Math.min(1, this.#wall + dt / this.#approach);
        const r = POSES[this.#shape.pose](frame.landmarks);
        if (r.match) {
          this.#held += dt; this.#grace = 0;
          this.#targetSub.textContent = 'Hold it… the magic is working!';
        } else {
          this.#grace += dt;
          if (this.#grace > GRACE) this.#held = Math.max(0, this.#held - dt * 1.5);
          if (this.#held === 0) this.#targetSub.textContent = r.score > 0.6 ? 'Almost! A little more…' : 'Make the shape with your body!';
        }
        this.#ringEl.style.setProperty('--p', Math.min(1, this.#held / HOLD).toFixed(3));
        if (this.#held >= HOLD) this.#success();
        else if (this.#wall >= 1) this.#miss();
        break;
      }
      case 'retreat':
        this.#wall = Math.max(0.15, this.#wall - dt * 0.9);
        if (!s.speaking && this.#phaseT > 2.5) this.#beginApproach();
        break;
      case 'portal':
        this.#dissolve = Math.min(1, this.#dissolve + dt * 0.8);
        if (this.#phaseT > 1.6 && !s.cardVisible) this.#teach();
        if (this.#phaseT > 4) s.showCardNext();
        if (s.cardVisible && !s.speaking && this.#phaseT > 7) this.#nextRound();
        break;
      default: break;
    }
  }

  render(dt) {
    const { ctx, w, h } = this.#shell.canvas();
    ctx.clearRect(0, 0, w, h);
    if (this.#phase === 'approach' || this.#phase === 'retreat' || this.#phase === 'portal' || this.#phase === 'intro') {
      this.#drawWall(ctx, w, h);
    }
    this.#shell.renderFx(dt);
  }

  /** Read-only snapshot for automated tests (?debug). */
  debug() { return { phase: this.#phase, shape: this.#shape?.id, wall: this.#wall }; }

  pause() {}
  resume() { this.#shell.resumeSpeech(); }
  destroy() { this.#root.removeEventListener('click', this.#onClick); this.#shell.destroy(); }

  /* ---------------- Flow ---------------- */

  #setPhase(p) { this.#phase = p; this.#phaseT = 0; }

  #startRound(i) {
    this.#round = i;
    this.#misses = 0;
    this.#wall = 0;
    this.#dissolve = 0;
    this.#path = new Path2D(shapePath(this.#shape.id));
    const shape = this.#shape;
    const s = this.#shell;
    s.hideCard();
    s.progress(i, [...Array(i).keys()]);
    s.banner(`Shape ${i + 1}: ${shape.name}`, 'is-soft');
    s.guide.playAnimation('demonstrate', { move: shape.pose });
    s.say(shape.cue);
    this.#showTarget();
    this.#setPhase('intro');
  }

  #showTarget() {
    const shape = this.#shape;
    this.#ringEl.innerHTML = posePictogram(shape.pose);
    this.#ringEl.style.setProperty('--p', 0);
    this.#shell.q('[data-target-title]').textContent = `Make a ${shape.name.toLowerCase()}!`;
    this.#targetSub.textContent = 'Watch Wren first…';
    this.#targetEl.hidden = false;
  }

  #beginApproach() {
    this.#held = 0; this.#grace = 0;
    this.#approach = APPROACH_BY_LEVEL[this.#level - 1] * (this.#misses ? 1.3 : 1);
    recordMetrics('castle', { poseAttempts: 1 });
    this.#targetSub.textContent = 'Make the shape with your body!';
    this.#shell.banner('Here comes the magic wall!', 'is-dance');
    audio.sfx('whoosh');
    this.#setPhase('approach');
  }

  #success() {
    const shape = this.#shape;
    const s = this.#shell;
    this.#stats[this.#round].success = true;
    recordMetrics('castle', { poseSuccesses: 1 });
    this.#targetEl.hidden = true;
    s.showHelp(false);
    audio.sfx('sparkle');
    s.burst(0.5, 0.5, 40);
    s.guide.playAnimation('celebrate');
    s.banner(`Magic ${shape.name.toLowerCase()}! The portal opens!`, 'is-win');
    this.#setPhase('portal');
  }

  #miss() {
    const shape = this.#shape;
    const s = this.#shell;
    this.#misses += 1;
    this.#stats[this.#round].misses += 1;
    recordMetrics('castle', { hints: 1 });
    s.guide.playAnimation('encourage');
    if (this.#misses >= 3) {
      this.#targetEl.hidden = true;
      s.banner(`Let's learn about the ${shape.name.toLowerCase()}!`, 'is-soft');
      this.#dissolve = 0;
      this.#setPhase('portal');
      return;
    }
    if (this.#misses >= 2) s.showHelp(true, 'Skip this shape');
    s.banner('Almost! Let\'s try again.', 'is-soft');
    s.say(`Good try! ${shape.tip}`);
    this.#setPhase('retreat');
  }

  #teach() {
    const shape = this.#shape;
    const s = this.#shell;
    audio.sfx('chime');
    s.showCard({ art: shapeArt(shape.id), kicker: 'Shape spell learned!', name: shape.name, chip: shape.short, fact: `${shape.teach} ${shape.example}` });
    s.say(`${shape.name}! ${shape.teach} ${shape.example}`);
  }

  #nextRound() {
    if (this.#round + 1 < SHAPES.length) { this.#startRound(this.#round + 1); return; }
    this.#finish();
  }

  #finish() {
    this.#setPhase('done');
    this.#shell.hideCard();
    const seconds = Math.round((performance.now() - this.#startedAt) / 1000);
    recordMetrics('castle', { secondsPlayed: seconds });
    const newCards = addDiscoveries(SHAPES.map((x) => `castle:${x.id}`));
    const misses = this.#stats.reduce((n, x) => n + x.misses, 0);
    const level = this.#level;
    const next = misses === 0 ? Math.min(3, level + 1) : misses >= 2 ? Math.max(1, level - 1) : level;
    setWorldLevel('castle', next);
    const hardest = [...this.#stats].reverse().reduce((b, x) => (x.misses > b.misses ? x : b));
    const shape = getShape(hardest.id);
    this.#onComplete({
      stats: this.#stats,
      seconds,
      newDiscoveries: newCards,
      level: { from: level, to: next },
      score: { done: this.#stats.filter((x) => x.success).length, total: SHAPES.length, label: 'shape spells cast' },
      learned: SHAPES.map((x) => ({ id: `castle:${x.id}`, art: shapeArt(x.id), title: x.name, sub: x.short })),
      question: {
        prompt: shape.question.prompt,
        hint: shape.question.hint,
        answer: shape.id,
        explain: `Yes! It's the ${shape.name.toLowerCase()}. ${shape.teach}`,
        options: SHAPES.map((x) => ({ id: x.id, label: x.name, art: shapeArt(x.id) })),
      },
    });
  }

  #onClick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'card-next' && this.#phase === 'portal') { audio.sfx('tap'); this.#nextRound(); }
    if (action === 'skip' && (this.#phase === 'approach' || this.#phase === 'retreat')) {
      audio.sfx('tap');
      this.#shell.showHelp(false);
      this.#targetEl.hidden = true;
      this.#dissolve = 0;
      this.#setPhase('portal');
    }
  };

  /* ---------------- Drawing ---------------- */

  #drawWall(ctx, w, h) {
    const shape = this.#shape;
    const ease = this.#wall * this.#wall * (3 - 2 * this.#wall);
    const scale = 0.3 + ease * 0.7;
    const ww = w * 0.5 * scale, wh = h * 0.62 * scale;
    const cx = w * 0.5, cy = h * 0.54;
    const fade = 1 - this.#dissolve;
    if (fade <= 0.01) { this.#drawPortal(ctx, cx, cy, Math.min(w, h) * 0.22); return; }

    ctx.save();
    ctx.globalAlpha = fade;
    // Stone wall with bricks.
    ctx.fillStyle = '#8a77c9';
    roundRect(ctx, cx - ww / 2, cy - wh / 2, ww, wh, 18 * scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,120,0.35)';
    ctx.lineWidth = Math.max(1, 3 * scale);
    const rows = 7, bh = wh / rows;
    for (let r = 1; r < rows; r++) {
      ctx.beginPath(); ctx.moveTo(cx - ww / 2, cy - wh / 2 + r * bh); ctx.lineTo(cx + ww / 2, cy - wh / 2 + r * bh); ctx.stroke();
    }
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 0.5 : 0;
      for (let c = 0; c < 5; c++) {
        const x = cx - ww / 2 + ((c + off) / 4.5) * ww;
        if (x <= cx - ww / 2 || x >= cx + ww / 2) continue;
        ctx.beginPath(); ctx.moveTo(x, cy - wh / 2 + r * bh); ctx.lineTo(x, cy - wh / 2 + (r + 1) * bh); ctx.stroke();
      }
    }
    // Runes.
    ctx.fillStyle = 'rgba(255,243,196,0.7)';
    for (const [rx, ry] of [[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]]) {
      ctx.save(); ctx.translate(cx + rx * ww, cy + ry * wh); starPath(ctx, 8 * scale, 4, 0.4); ctx.fill(); ctx.restore();
    }
    // Shape cut-out: glows brighter as the hold progresses.
    const size = Math.min(ww, wh) * 0.62;
    const glow = Math.min(1, this.#held / HOLD);
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 120, size / 120);
    ctx.fillStyle = `rgba(40, 24, 90, ${0.75 * (1 - glow)})`;
    ctx.fill(this.#path);
    ctx.fillStyle = shape.color;
    ctx.globalAlpha = fade * glow;
    ctx.fill(this.#path);
    ctx.globalAlpha = fade;
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff3c4';
    ctx.shadowColor = shape.color;
    ctx.shadowBlur = 20 + glow * 30;
    ctx.stroke(this.#path);
    ctx.restore();
    ctx.restore();
    if (this.#dissolve > 0) {
      if (Math.random() < 0.6) this.#shell.particles.spawn('star', 0.5 + (Math.random() - 0.5) * 0.4, 0.54 + (Math.random() - 0.5) * 0.5, true, shape.color);
      this.#drawPortal(ctx, cx, cy, Math.min(w, h) * 0.22 * this.#dissolve);
    }
  }

  #drawPortal(ctx, cx, cy, r) {
    const t = performance.now() / 1000;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(255,243,196,0.95)');
    g.addColorStop(0.5, 'rgba(184,169,232,0.75)');
    g.addColorStop(1, 'rgba(109,79,194,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (0.4 + i * 0.18), t * (1 + i * 0.4), t * (1 + i * 0.4) + Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }
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
