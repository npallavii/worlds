// World 4 — Deep Sea Discovery.
//
// Captain Coral's yellow submarine travels up an underwater river toward Coral Cove.
//   • Lean (or step) left/right to steer — measured against the calibrated neutral pose,
//     with smoothing and a dead zone (shared/bodyMapping.js → steering()).
//   • Row both arms (low → high → low) to go faster; each full stroke counts once.
//   • Collect starfish; swim into creature bubbles to discover a sea animal and its fact.
//   • Rocks and jellyfish are gentle obstacles: a bump wobbles the sub and slows it for a
//     moment. Nothing is ever taken away.
//   • Finish: reach Coral Cove (always reachable — the sub keeps moving on its own).
// Direction words are taught as starfish appear ("Starfish on your left!").
//
// Adaptive rules (deterministic):
//   • Level 1/2/3: base speed 0.16 / 0.19 / 0.22 screens per second; obstacles every
//     4th / 3rd / 2nd starfish.
//   • Session collecting ≥ 80% of starfish with ≤ 2 bumps → level +1; < 40% → level −1.
import { audio } from '../../core/audio.js';
import { pose } from '../../core/pose/PoseService.js';
import { recordMetrics, addDiscoveries, getWorldProgress, setWorldLevel } from '../../core/progress.js';
import { CORAL } from '../../characters/humanoid.js';
import { icon } from '../../ui/icons.js';
import { WorldShell, starPath, svgImage } from '../shared/WorldShell.js';
import { steering, RowCounter } from '../shared/bodyMapping.js';
import { CREATURES, creatureArt, getCreature } from './seaData.js';

const GOAL = 6;                    // screens to travel
const SUB_Y = 0.76;
const BASE_SPEED = [0.16, 0.19, 0.22];
const OBSTACLE_EVERY = [4, 3, 2];
const LANES = [0.27, 0.5, 0.73];
const PICKUP = { star: 0.1, creature: 0.12, rock: 0.07, jelly: 0.07 };

export function createWorld(ctx) { return new SeaWorld(ctx); }

class SeaWorld {
  #root; #onComplete; #shell;
  #level = 1;
  #phase = 'idle'; #phaseT = 0;
  #objects = [];
  #distance = 0;
  #subX = 0.5; #subVX = 0;
  #boost = 0;
  #slow = 0;                   // seconds of slow-motion (while a discovery card is up)
  #bump = 0;                   // seconds of wobble after a bump
  #rows = new RowCounter();
  #rowFlash = 0;
  #stars = 0; #starsTotal = 0; #bumps = 0;
  #found = [];
  #cueCount = 0;
  #lastBumpLine = -99;
  #startedAt = 0;
  #countShown = 0;
  #el = {};

  constructor({ root, onComplete }) { this.#root = root; this.#onComplete = onComplete; }

  async initialize() {
    this.#level = Math.min(3, Math.max(1, getWorldProgress('sea')?.level ?? 1));
    this.#shell = new WorldShell(this.#root, {
      id: 'sea',
      guideDef: CORAL,
      sceneHtml: '<div class="sea-water"></div>',
      overlayHtml: `
        <div class="sea-hud">
          <span class="sea-count">${icon('star')}<b data-stars>0</b></span>
          <span class="sea-trip"><span class="sea-trip-fill" data-trip></span><span class="sea-trip-label">Coral Cove</span></span>
          <span class="sea-row" data-row>${icon('row')} Row to go faster!</span>
        </div>`,
    });
    this.#el = { stars: this.#shell.q('[data-stars]'), trip: this.#shell.q('[data-trip]'), row: this.#shell.q('[data-row]') };
    this.#buildCourse();
    this.#root.addEventListener('click', this.#onClick);
  }

  start() {
    this.#startedAt = performance.now();
    recordMetrics('sea', { sessions: 1 });
    const s = this.#shell;
    s.guide.playAnimation('wave');
    s.banner('Ahoy, explorer!', 'is-soft');
    s.say("Ahoy! Lean left and right to steer the submarine. Row your arms like paddles to go faster. Let's collect starfish and find sea creatures!");
    this.#setPhase('intro');
  }

  update(dt, frame) {
    const s = this.#shell;
    this.#phaseT += dt;
    s.stage.render(frame);
    this.#rowFlash = Math.max(0, this.#rowFlash - dt);
    this.#el.row.classList.toggle('is-on', this.#rowFlash > 0);

    if (this.#phase === 'intro') {
      if (!s.speaking && this.#phaseT > 3) { this.#setPhase('countdown'); }
      return;
    }
    if (this.#phase === 'countdown') {
      const n = 3 - Math.floor(this.#phaseT);
      if (n > 0 && n !== this.#countShown) { this.#countShown = n; s.banner(`${n}`, 'is-dance'); audio.sfx('tap'); }
      if (n <= 0) { s.banner('Go!', 'is-win'); audio.sfx('whoosh'); this.#setPhase('swim'); }
      return;
    }
    if (this.#phase === 'arrive') {
      if (this.#phaseT > 2.5) s.showCardNext();
      if (!s.speaking && this.#phaseT > 6) this.#finish();
      return;
    }
    if (this.#phase !== 'swim') return;
    if (!s.tracking(frame, dt)) return;

    // Steering: position control, smoothed so the sub glides rather than jumps.
    const steer = steering(frame, pose.calibration);
    const targetX = 0.5 + steer * 0.36;
    const prev = this.#subX;
    this.#subX += (targetX - this.#subX) * Math.min(1, dt * 4);
    this.#subVX = (this.#subX - prev) / Math.max(dt, 1e-3);

    // Rowing.
    if (this.#rows.update(frame)) {
      this.#boost = Math.min(0.3, this.#boost + 0.1);
      this.#rowFlash = 0.5;
      for (let i = 0; i < 6; i++) s.particles.spawn('bubble', this.#subX + (Math.random() - 0.5) * 0.05, SUB_Y + 0.08, false);
    }
    this.#boost = Math.max(0, this.#boost - dt * 0.08); // fades over ~1 s, so steady rowing keeps you fast
    this.#slow = Math.max(0, this.#slow - dt);
    this.#bump = Math.max(0, this.#bump - dt);
    const speed = (BASE_SPEED[this.#level - 1] + this.#boost) * (this.#slow > 0 ? 0.3 : 1) * (this.#bump > 0.4 ? 0.4 : 1);
    this.#distance = Math.min(GOAL, this.#distance + speed * dt);
    this.#el.trip.style.width = `${(this.#distance / GOAL) * 100}%`;

    if (Math.random() < dt * 3) s.particles.spawn('bubble', Math.random(), 1.02, false);
    this.#collide();
    if (this.#slow <= 0 && s.cardVisible && !s.speaking) s.hideCard();
    if (this.#distance >= GOAL) this.#arrive();
  }

  render(dt) {
    const { ctx, w, h } = this.#shell.canvas();
    ctx.clearRect(0, 0, w, h);
    this.#drawRiver(ctx, w, h);
    for (const o of this.#objects) {
      if (o.taken) continue;
      const y = this.#yOf(o);
      if (y < -0.15 || y > 1.15) continue;
      this.#drawObject(ctx, o, o.x * w, y * h, h);
    }
    this.#drawSub(ctx, w, h);
    this.#shell.renderFx(dt);
  }

  /** Read-only snapshot for automated tests (?debug). */
  debug() {
    return {
      phase: this.#phase, subX: this.#subX, distance: this.#distance, stars: this.#stars, boost: this.#boost,
      ahead: this.#objects.filter((o) => !o.taken && this.#yOf(o) < SUB_Y + 0.02 && this.#yOf(o) > -0.1).map((o) => ({ kind: o.kind, x: o.x, y: this.#yOf(o) })),
    };
  }

  pause() {}
  resume() { this.#shell.resumeSpeech(); }
  destroy() { this.#root.removeEventListener('click', this.#onClick); this.#shell.destroy(); }

  /* ---------------- Course ---------------- */

  #setPhase(p) { this.#phase = p; this.#phaseT = 0; }
  #yOf(o) { return SUB_Y - (o.d - this.#distance); }

  #buildCourse() {
    const objs = [];
    let i = 0;
    const pattern = [0, 2, 1, 2, 0, 1, 0, 2, 1, 1, 2, 0];
    for (let d = 0.8; d < GOAL - 0.4; d += 0.5, i++) {
      const lane = pattern[i % pattern.length];
      objs.push({ kind: 'star', d, x: LANES[lane], cued: false });
      if (i % OBSTACLE_EVERY[this.#level - 1] === 1) {
        const other = (lane + 1 + (i % 2)) % 3;
        objs.push({ kind: i % 2 ? 'rock' : 'jelly', d: d + 0.25, x: LANES[other], phase: Math.random() * 6 });
      }
    }
    CREATURES.forEach((c, k) => {
      const d = GOAL * (0.18 + k * 0.22);
      // Put the bubble in a lane free of obstacles near that distance.
      const blocked = new Set(objs.filter((o) => (o.kind === 'rock' || o.kind === 'jelly') && Math.abs(o.d - d) < 0.3).map((o) => o.x));
      const x = [LANES[1], LANES[0], LANES[2]].find((l) => !blocked.has(l)) ?? LANES[1];
      objs.push({ kind: 'creature', d, x, id: c.id });
    });
    this.#objects = objs.sort((a, b) => a.d - b.d);
    this.#starsTotal = objs.filter((o) => o.kind === 'star').length;
  }

  #collide() {
    const { w, h } = this.#shell.canvas();
    const aspect = w / h;
    const s = this.#shell;
    for (const o of this.#objects) {
      if (o.taken) continue;
      const y = this.#yOf(o);
      // Direction cue as a starfish comes into view.
      if (o.kind === 'star' && !o.cued && y > 0.12) {
        o.cued = true;
        this.#cueCount++;
        const side = o.x < 0.4 ? 'left' : o.x > 0.6 ? 'right' : 'middle';
        s.banner(side === 'left' ? '⟵ Starfish on your left!' : side === 'right' ? 'Starfish on your right! ⟶' : 'Starfish straight ahead!', 'is-soft');
        if (this.#cueCount % 3 === 1 && !s.speaking) s.say(side === 'middle' ? 'Straight ahead!' : `Lean to your ${side}!`);
      }
      if (y < SUB_Y - 0.2 || y > SUB_Y + 0.2) continue;
      const d = Math.hypot((o.x - this.#subX) * aspect, y - SUB_Y);
      if (d > PICKUP[o.kind]) continue;

      if (o.kind === 'star') {
        o.taken = true;
        this.#stars++;
        this.#el.stars.textContent = String(this.#stars);
        audio.sfx('pop');
        s.burst(o.x, y, 12);
      } else if (o.kind === 'creature') {
        o.taken = true;
        this.#discover(o.id);
      } else if (this.#bump <= 0) {
        this.#bumps++;
        this.#bump = 1;
        audio.sfx('soft');
        for (let k = 0; k < 10; k++) s.particles.spawn('bubble', this.#subX, SUB_Y, true);
        if (this.#phaseT - this.#lastBumpLine > 8 && !s.speaking) {
          this.#lastBumpLine = this.#phaseT;
          s.say(o.kind === 'rock' ? 'Gentle bump! Lean to steer around the rocks.' : 'Whoops, a jellyfish! Lean to swim around it.');
        }
      }
    }
  }

  #discover(id) {
    const c = getCreature(id);
    const s = this.#shell;
    this.#found.push(id);
    recordMetrics('sea', { poseSuccesses: 1 });
    this.#slow = 5;
    audio.sfx('chime');
    s.burst(this.#subX, SUB_Y - 0.05, 20);
    s.showCard({ art: creatureArt(id), kicker: 'Sea creature discovered!', name: c.name, chip: '', fact: c.fact });
    s.showCardNext();
    s.guide.playAnimation('happy');
    s.say(`You found a ${c.name.toLowerCase()}! ${c.fact}`);
  }

  #arrive() {
    const s = this.#shell;
    this.#setPhase('arrive');
    audio.sfx('sparkle');
    s.burst(0.5, 0.4, 40);
    s.guide.playAnimation('celebrate');
    s.banner('Coral Cove!', 'is-win');
    s.showCard({
      art: creatureArt(this.#found[this.#found.length - 1] ?? 'clownfish'),
      kicker: 'You made it!',
      name: 'Welcome to Coral Cove',
      chip: `${this.#stars} of ${this.#starsTotal} starfish`,
      fact: 'Coral reefs are home to lots of different sea animals. Keeping oceans clean helps them stay healthy.',
    });
    s.say(`We made it to Coral Cove! You collected ${this.#stars} starfish. Keeping our oceans clean helps all these sea animals stay healthy.`);
  }

  #finish() {
    if (this.#phase === 'done') return;
    this.#setPhase('done');
    this.#shell.hideCard();
    const seconds = Math.round((performance.now() - this.#startedAt) / 1000);
    recordMetrics('sea', { secondsPlayed: seconds, poseAttempts: CREATURES.length });
    const newCards = addDiscoveries(this.#found.map((id) => `sea:${id}`));
    const ratio = this.#stars / Math.max(1, this.#starsTotal);
    const level = this.#level;
    const next = ratio >= 0.8 && this.#bumps <= 2 ? Math.min(3, level + 1) : ratio < 0.4 ? Math.max(1, level - 1) : level;
    setWorldLevel('sea', next);

    const asked = getCreature(this.#found[this.#found.length - 1] ?? 'octopus');
    const shown = CREATURES.filter((c) => c.id === asked.id || this.#found.includes(c.id));
    const options = (shown.length >= 3 ? shown : CREATURES).slice(0, 3);
    if (!options.some((c) => c.id === asked.id)) options[2] = asked;

    this.#onComplete({
      stats: { stars: this.#stars, starsTotal: this.#starsTotal, bumps: this.#bumps, found: this.#found },
      seconds,
      newDiscoveries: newCards,
      level: { from: level, to: next },
      score: { done: this.#found.length, total: CREATURES.length, label: 'sea creatures discovered' },
      learned: CREATURES.map((c) => ({ id: `sea:${c.id}`, art: creatureArt(c.id), title: c.name, sub: this.#found.includes(c.id) ? 'discovered' : 'swim by next time!' })),
      question: {
        prompt: asked.question.prompt,
        hint: asked.question.hint,
        answer: asked.id,
        explain: `Yes! It's the ${asked.name.toLowerCase()}. ${asked.fact}`,
        options: options.map((c) => ({ id: c.id, label: c.name, art: creatureArt(c.id) })),
      },
    });
  }

  #onClick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action !== 'card-next') return;
    audio.sfx('tap');
    if (this.#phase === 'arrive') { this.#finish(); return; }
    this.#slow = 0;
    this.#shell.hideCard();
  };

  /* ---------------- Drawing ---------------- */

  #drawRiver(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7fd3ec'); g.addColorStop(1, '#2a86b4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const t = performance.now() / 1000;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 0.27 + Math.sin(t * 0.2 + i) * 0.03) % 1) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w * 0.06, 0); ctx.lineTo(x - w * 0.1, h); ctx.lineTo(x - w * 0.16, h); ctx.fill();
    }
    // Reef banks scroll with distance.
    const colors = ['#ff8a8a', '#ffb37a', '#c97ad9', '#3fae86'];
    for (const side of [0, 1]) {
      for (let k = -1; k < 8; k++) {
        const baseD = Math.floor(this.#distance * 4) / 4 + k * 0.25;
        const y = (SUB_Y - (baseD - this.#distance)) * h;
        const x = side ? w - 30 - ((k * 37) % 40) : 30 + ((k * 53) % 40);
        ctx.fillStyle = colors[Math.abs(Math.round(baseD * 4 + side)) % colors.length];
        ctx.beginPath(); ctx.ellipse(x, y, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + (side ? -18 : 18), y - 18, 16, 26, side ? 0.4 : -0.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Coral Cove arch near the goal.
    const coveY = (SUB_Y - (GOAL - this.#distance)) * h;
    if (coveY > -h * 0.3) {
      ctx.fillStyle = '#ff9fbb';
      ctx.beginPath(); ctx.ellipse(w / 2, coveY - h * 0.08, w * 0.3, h * 0.14, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2a6f99';
      ctx.beginPath(); ctx.ellipse(w / 2, coveY - h * 0.06, w * 0.18, h * 0.09, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.font = `800 ${Math.round(h * 0.04)}px "Baloo 2", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Coral Cove', w / 2, coveY - h * 0.2);
    }
  }

  #drawObject(ctx, o, x, y, h) {
    const t = performance.now() / 1000;
    ctx.save();
    ctx.translate(x, y);
    if (o.kind === 'star') {
      ctx.rotate(Math.sin(t * 2 + o.d) * 0.2);
      ctx.fillStyle = '#ff9a3c';
      ctx.shadowColor = 'rgba(255,200,87,0.8)'; ctx.shadowBlur = 14;
      starPath(ctx, h * 0.04, 5, 0.5); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd08a';
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.arc(Math.cos(a) * h * 0.02, Math.sin(a) * h * 0.02, h * 0.005, 0, Math.PI * 2); ctx.fill(); }
    } else if (o.kind === 'rock') {
      ctx.fillStyle = '#7d8aa3';
      ctx.beginPath(); ctx.ellipse(0, 0, h * 0.05, h * 0.038, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5fae7a';
      ctx.beginPath(); ctx.ellipse(-h * 0.015, -h * 0.025, h * 0.02, h * 0.01, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.kind === 'jelly') {
      const pulse = 1 + Math.sin(t * 3 + o.phase) * 0.08;
      ctx.fillStyle = 'rgba(255,159,187,0.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, h * 0.04 * pulse, h * 0.03, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,159,187,0.8)'; ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * h * 0.014, 0);
        ctx.quadraticCurveTo(i * h * 0.014 + Math.sin(t * 4 + i) * 6, h * 0.03, i * h * 0.012, h * 0.055); ctx.stroke();
      }
    } else if (o.kind === 'creature') {
      const r = h * 0.07;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, Math.sin(t * 2) * 4, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const img = svgImage(`sea:${o.id}`, creatureArt(o.id));
      if (img.complete) ctx.drawImage(img, -r * 0.8, -r * 0.8 + Math.sin(t * 2) * 4, r * 1.6, r * 1.6);
    }
    ctx.restore();
  }

  #drawSub(ctx, w, h) {
    const x = this.#subX * w, y = SUB_Y * h;
    const t = performance.now() / 1000;
    const tilt = Math.max(-0.35, Math.min(0.35, this.#subVX * 0.4)) + (this.#bump > 0 ? Math.sin(t * 30) * 0.12 * this.#bump : 0);
    const s = h * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    // Propeller (bottom), spinning faster when rowing.
    ctx.save();
    ctx.translate(0, s * 1.55);
    ctx.scale(Math.cos(t * (12 + this.#boost * 60)), 1);
    ctx.fillStyle = '#e5a800';
    ctx.fillRect(-s * 0.55, -s * 0.08, s * 1.1, s * 0.16);
    ctx.restore();
    // Fins.
    ctx.fillStyle = '#e5a800';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.6); ctx.lineTo(-s * 1.15, s * 1.2); ctx.lineTo(-s * 0.55, s * 1.05); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.7, s * 0.6); ctx.lineTo(s * 1.15, s * 1.2); ctx.lineTo(s * 0.55, s * 1.05); ctx.fill();
    // Body (nose up).
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.75, s * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e5a800'; ctx.lineWidth = 3; ctx.stroke();
    // Tower + windows.
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.32, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    for (const wy of [-s * 0.85, s * 0.45]) {
      ctx.fillStyle = '#bfefff'; ctx.strokeStyle = '#e5a800';
      ctx.beginPath(); ctx.arc(0, wy, s * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}
