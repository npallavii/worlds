// Shared building blocks for world modules: the screen layout (scene, game canvas, effects
// canvas, guide character, banner, progress, info card, help button, camera mirror),
// guide speech that survives pausing, tracking-loss detection, and particle effects.
//
// A world owns its rules; the shell owns everything every world looks and behaves the same in.
import { createCharacter } from '../../characters/CharacterController.js';
import { audio } from '../../core/audio.js';
import { ISSUE_HINTS } from '../../core/pose/PoseService.js';
import { stageMarkup, mountStage } from '../../ui/poseStage.js';
import { fitCanvas } from '../../ui/poseOverlay.js';
import { icon } from '../../ui/icons.js';

const LOST_PAUSE = 1;   // seconds out of frame before the activity pauses
const BACK_RESUME = 0.8; // seconds back in frame before it resumes

export class WorldShell {
  guide = null;
  stage = null;
  particles = new Particles();
  #root; #el = {};
  #speaking = false; #lastLine = null;
  #lost = 0; #back = 0; #paused = false;

  /**
   * @param root   element provided by the gameplay host
   * @param opts   { id, sceneHtml, guideDef, overlayHtml, progressTotal, progressIcon }
   */
  constructor(root, { id, sceneHtml, guideDef, overlayHtml = '', progressTotal = 0, progressIcon = 'star' }) {
    this.#root = root;
    root.innerHTML = `
      <div class="world w-${id}">
        <div class="world-scene" aria-hidden="true">${sceneHtml}</div>
        <canvas class="world-canvas" aria-hidden="true"></canvas>
        <div class="world-guide" data-guide></div>
        ${overlayHtml}
        <canvas class="world-fx" aria-hidden="true"></canvas>
        <div class="world-progress" data-progress aria-label="Progress" ${progressTotal ? '' : 'hidden'}>
          ${Array.from({ length: progressTotal }, (_, i) => `<span class="round-dot" data-dot="${i}">${icon(progressIcon)}</span>`).join('')}
        </div>
        <div class="world-banner" data-banner aria-live="assertive"></div>
        <article class="discovery-card world-card-info" data-card hidden>
          <div class="discovery-art" data-card-art></div>
          <div class="discovery-copy">
            <p class="discovery-kicker" data-card-kicker></p>
            <h2 data-card-name></h2>
            <p class="discovery-feeling" data-card-chip-row><strong data-card-chip></strong></p>
            <p class="discovery-fact" data-card-fact></p>
            <div class="discovery-actions"><button class="btn btn-primary" data-action="card-next" hidden>Next ${icon('play')}</button></div>
          </div>
        </article>
        <div class="world-help" data-help hidden><button class="btn btn-soft" data-action="skip">Skip this one</button></div>
        <div class="game-pip">${stageMarkup()}</div>
      </div>`;
    const q = (s) => root.querySelector(s);
    this.#el = {
      world: q('.world'), canvas: q('.world-canvas'), fx: q('.world-fx'), banner: q('[data-banner]'),
      card: q('[data-card]'), cardArt: q('[data-card-art]'), cardKicker: q('[data-card-kicker]'), cardName: q('[data-card-name]'),
      cardChipRow: q('[data-card-chip-row]'), cardChip: q('[data-card-chip]'), cardFact: q('[data-card-fact]'), cardNext: q('[data-action="card-next"]'),
      help: q('[data-help]'), dots: [...root.querySelectorAll('[data-dot]')],
    };
    this.guide = createCharacter(guideDef, q('[data-guide]'));
    this.stage = mountStage(root);
  }

  q(sel) { return this.#root.querySelector(sel); }
  get root() { return this.#el.world; }

  /** Game canvas sized to the screen; returns { ctx, w, h } in CSS pixels. */
  canvas() { return fitCanvas(this.#el.canvas); }

  /* ---------- Speech (guide talks; progress can wait on `speaking`) ---------- */

  say(text) {
    const line = { text, interrupted: false };
    this.#lastLine = line;
    this.#speaking = true;
    this.guide.say(text).then((r) => {
      if (this.#lastLine === line) { this.#speaking = false; line.interrupted = r === 'interrupted'; }
    });
  }
  get speaking() { return this.#speaking; }
  /** Call from world.resume(): repeats a line that pausing cut off. */
  resumeSpeech() { if (this.#lastLine?.interrupted) this.say(this.#lastLine.text); }

  /* ---------- HUD ---------- */

  banner(text, tone = '') {
    const b = this.#el.banner;
    b.textContent = text;
    b.className = `world-banner ${tone}`;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  }

  progress(current, done = []) {
    this.#el.dots.forEach((d, i) => {
      d.classList.toggle('is-current', i === current);
      d.classList.toggle('is-done', done.includes(i));
    });
  }

  showCard({ art = '', kicker = 'New discovery!', name, chip = '', fact = '' }) {
    const e = this.#el;
    e.cardArt.innerHTML = art;
    e.cardKicker.textContent = kicker;
    e.cardName.textContent = name;
    e.cardChip.textContent = chip;
    e.cardChipRow.hidden = !chip;
    e.cardFact.textContent = fact;
    e.cardNext.hidden = true;
    e.card.hidden = false;
  }
  showCardNext() { this.#el.cardNext.hidden = false; }
  hideCard() { this.#el.card.hidden = true; }
  get cardVisible() { return !this.#el.card.hidden; }

  showHelp(show, label) {
    this.#el.help.hidden = !show;
    if (label) this.#el.help.querySelector('button').textContent = label;
  }

  /* ---------- Tracking loss ---------- */

  /**
   * Call every frame during an active phase. Returns true while the activity should run.
   * Handles the hint bubble and the "come back" pause/resume with the guide's voice.
   */
  tracking(frame, dt, { onPause, onResume } = {}) {
    const ok = !!frame?.inFrame;
    if (!this.#paused) {
      this.#lost = ok ? 0 : this.#lost + dt;
      this.stage.hint(this.#lost > 0.5 ? (frame?.issue ?? 'noPerson') : null);
      if (this.#lost > LOST_PAUSE) {
        this.#paused = true;
        this.#back = 0;
        this.banner('Paused — come back into the picture!', 'is-soft');
        this.say(ISSUE_HINTS[frame?.issue ?? 'noPerson']);
        onPause?.();
      }
      return !this.#paused;
    }
    this.stage.hint(ok ? null : (frame?.issue ?? 'noPerson'));
    this.#back = ok ? this.#back + dt : 0;
    if (this.#back > BACK_RESUME) {
      this.#paused = false;
      this.#lost = 0;
      this.banner('Welcome back!', 'is-soft');
      onResume?.();
      return true;
    }
    return false;
  }

  /* ---------- Effects ---------- */

  burst(x, y, n = 24) { for (let i = 0; i < n; i++) this.particles.spawn('star', x, y, true); }

  renderFx(dt) {
    this.particles.update(dt);
    const { ctx, w, h } = fitCanvas(this.#el.fx);
    ctx.clearRect(0, 0, w, h);
    this.particles.render(ctx, w, h);
  }

  destroy() {
    audio.stopSpeech();
    this.stage?.detach();
    this.guide?.destroy();
    this.guide = null;
    this.#root.innerHTML = '';
  }
}

/* ------------------------------------------------------------------ */

export class Particles {
  list = [];

  spawn(kind, x, y, burst = false, color) {
    if (this.list.length > 160) return;
    const colors = ['#ffc857', '#ff8a65', '#7fd8be', '#b8a9e8', '#fff3c4'];
    this.list.push({
      kind, x, y,
      vx: burst ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.04,
      vy: burst ? -Math.random() * 0.45 - 0.1 : -0.12 - Math.random() * 0.08,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 3,
      size: kind === 'note' ? 26 + Math.random() * 14 : kind === 'bubble' ? 4 + Math.random() * 6 : 7 + Math.random() * 7,
      color: color ?? colors[Math.floor(Math.random() * colors.length)],
      life: 1, decay: burst ? 0.7 : 0.45,
    });
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'star') p.vy += 0.5 * dt;
      p.life -= p.decay * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  render(ctx, w, h) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.save();
      ctx.translate(p.x * w, p.y * h);
      ctx.rotate(p.rot);
      if (p.kind === 'note') {
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px "Baloo 2", sans-serif`;
        ctx.fillText('♪', 0, 0);
      } else if (p.kind === 'bubble') {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        starPath(ctx, p.size);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

export function starPath(ctx, r, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? r * inner : r;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
}

/** Draws an SVG string onto a canvas: converts once to an Image and caches it. */
const imageCache = new Map();
export function svgImage(key, svg) {
  let img = imageCache.get(key);
  if (!img) {
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`;
    imageCache.set(key, img);
  }
  return img;
}
