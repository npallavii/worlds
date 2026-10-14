// World 5 — Healthy Kitchen Quest.
//
// Chef Pepper shows a recipe card ("Rainbow Fruit Salad: 2 bananas, 2 strawberries, 1 apple").
// Ingredients fall from the shelves; the child moves side to side and a basket follows their
// body (torso midpoint vs. the calibrated centre, smoothed and clamped — see bodyX()).
// Catching a recipe ingredient ticks it off and names its food group. Catching anything else
// is a teaching moment: Chef Pepper says what it is and that it isn't in this recipe — no
// food is ever called bad, and nothing is lost. A finished recipe animates into a meal.
//
// Movement is predictable: items fall straight with a gentle sway at a level-based speed,
// and a needed ingredient is guaranteed at least every second drop.
//
// Adaptive rules (deterministic):
//   • Level 1/2/3: fall speed 0.17 / 0.21 / 0.25 screens per second; drop every 1.5 / 1.3 / 1.1 s;
//     recipes get more ingredients (fruit salad → soup → sandwich).
//   • Session catching ≥ 75% of needed drops → level +1; < 40% → level −1.
import { audio } from '../../core/audio.js';
import { pose } from '../../core/pose/PoseService.js';
import { recordMetrics, addDiscoveries, getWorldProgress, setWorldLevel } from '../../core/progress.js';
import { PEPPER } from '../../characters/humanoid.js';
import { worldScene } from '../../ui/scenery.js';
import { WorldShell, svgImage } from '../shared/WorldShell.js';
import { bodyX } from '../shared/bodyMapping.js';
import { FOODS, GROUPS, RECIPES_BY_LEVEL, getRecipe, foodSvg, mealArt, qty } from './kitchenData.js';

const FALL = [0.17, 0.21, 0.25];
const DROP_EVERY = [1.5, 1.3, 1.1];
const BASKET_Y = 0.84;
const BASKET_HALF = 0.08;   // fraction of width
const ITEM_R = 0.045;       // fraction of height
const EXTRAS = ['cookie', 'cupcake', 'fish', 'milk', 'egg', 'bread', 'cheese', 'broccoli', 'apple', 'banana', 'carrot'];

export function createWorld(ctx) { return new KitchenWorld(ctx); }

class KitchenWorld {
  #root; #onComplete; #shell;
  #level = 1;
  #recipes = [];
  #rIndex = 0;
  #have = {};
  #items = [];
  #basketX = 0.5;
  #phase = 'idle'; #phaseT = 0;
  #dropT = 0; #drops = 0; #lastLane = -1;
  #neededDropped = 0; #neededCaught = 0; #extras = 0;
  #lastExtraLine = -99;
  #startedAt = 0;
  #cardEl = null;

  constructor({ root, onComplete }) { this.#root = root; this.#onComplete = onComplete; }

  get #recipe() { return this.#recipes[this.#rIndex]; }

  async initialize() {
    this.#level = Math.min(3, Math.max(1, getWorldProgress('kitchen')?.level ?? 1));
    this.#recipes = RECIPES_BY_LEVEL[this.#level - 1].map(getRecipe);
    this.#shell = new WorldShell(this.#root, {
      id: 'kitchen',
      guideDef: PEPPER,
      sceneHtml: worldScene('kitchen'),
      progressTotal: this.#recipes.length,
      progressIcon: 'recipe',
      overlayHtml: '<aside class="recipe-card" data-recipe aria-live="polite"></aside>',
    });
    this.#cardEl = this.#shell.q('[data-recipe]');
    this.#root.addEventListener('click', this.#onClick);
  }

  start() {
    this.#startedAt = performance.now();
    recordMetrics('kitchen', { sessions: 1 });
    this.#startRecipe(0);
  }

  update(dt, frame) {
    const s = this.#shell;
    this.#phaseT += dt;
    s.stage.render(frame);

    if (this.#phase === 'intro') {
      if (!s.speaking && this.#phaseT > 2.5) { s.banner('Catch the ingredients!', 'is-dance'); this.#setPhase('catch'); }
      return;
    }
    if (this.#phase === 'cook') {
      if (this.#phaseT > 2.5) s.showCardNext();
      if (!s.speaking && this.#phaseT > 6.5) this.#nextRecipe();
      return;
    }
    if (this.#phase !== 'catch') return;
    if (!s.tracking(frame, dt)) return;

    // Basket follows the body: smoothed and kept inside the counter.
    const target = bodyX(frame, pose.calibration);
    if (target !== null) {
      const x = 0.2 + target * 0.6;
      this.#basketX += (x - this.#basketX) * Math.min(1, dt * 8);
    }

    this.#dropT += dt;
    if (this.#dropT >= DROP_EVERY[this.#level - 1]) { this.#dropT = 0; this.#drop(); }

    const speed = FALL[this.#level - 1];
    for (const it of this.#items) {
      if (it.done) continue;
      it.y += speed * dt;
      it.t += dt;
      const x = it.x + Math.sin(it.t * 2 + it.phase) * 0.012;
      if (!it.checked && it.y >= BASKET_Y - 0.03) {
        it.checked = true;
        if (Math.abs(x - this.#basketX) < BASKET_HALF + 0.02) { it.done = true; this.#catch(it, x); }
      }
      if (it.y > 1.1) it.done = true;
    }
    this.#items = this.#items.filter((it) => !it.done);
  }

  render(dt) {
    const { ctx, w, h } = this.#shell.canvas();
    ctx.clearRect(0, 0, w, h);
    for (const it of this.#items) {
      const img = svgImage(`food:${it.id}`, foodSvg(it.id));
      const r = ITEM_R * h;
      const x = (it.x + Math.sin(it.t * 2 + it.phase) * 0.012) * w;
      if (img.complete) {
        ctx.save();
        ctx.translate(x, it.y * h);
        ctx.rotate(Math.sin(it.t * 1.5 + it.phase) * 0.15);
        ctx.drawImage(img, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
        ctx.restore();
      }
    }
    if (this.#phase === 'catch' || this.#phase === 'intro') this.#drawBasket(ctx, w, h);
    this.#shell.renderFx(dt);
  }

  /** Read-only snapshot for automated tests (?debug). */
  debug() { return { phase: this.#phase, basketX: this.#basketX, needed: this.#needed(), items: this.#items.map((i) => ({ id: i.id, x: i.x, y: i.y, needed: i.id in this.#recipe.items })) }; }

  pause() {}
  resume() { this.#shell.resumeSpeech(); }
  destroy() { this.#root.removeEventListener('click', this.#onClick); this.#shell.destroy(); }

  /* ---------------- Flow ---------------- */

  #setPhase(p) { this.#phase = p; this.#phaseT = 0; }

  #startRecipe(i) {
    this.#rIndex = i;
    this.#have = Object.fromEntries(Object.keys(this.#recipe.items).map((k) => [k, 0]));
    this.#items = [];
    this.#drops = 0;
    this.#dropT = 0;
    const s = this.#shell;
    s.hideCard();
    s.progress(i, [...Array(i).keys()]);
    this.#renderCard();
    const list = Object.entries(this.#recipe.items).map(([id, n]) => qty(id, n));
    s.banner(this.#recipe.name, 'is-soft');
    s.guide.playAnimation('wave');
    s.say(`Let's make ${this.#recipe.name}! We need ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}. Move side to side to catch them in your basket!`);
    this.#setPhase('intro');
  }

  #renderCard() {
    const r = this.#recipe;
    this.#cardEl.innerHTML = `
      <h2>${r.name}</h2>
      <ul>${Object.entries(r.items).map(([id, n]) => {
        const got = this.#have[id] ?? 0;
        return `<li class="${got >= n ? 'is-done' : ''}">
          <span class="recipe-icon">${foodSvg(id)}</span>
          <span class="recipe-name">${n > 1 ? FOODS[id].plural : FOODS[id].one ?? FOODS[id].name}</span>
          <span class="recipe-count">${Math.min(got, n)}/${n}</span>
        </li>`;
      }).join('')}</ul>`;
  }

  #needed() {
    return Object.entries(this.#recipe.items).filter(([id, n]) => (this.#have[id] ?? 0) < n).map(([id]) => id);
  }

  #drop() {
    const needed = this.#needed();
    if (!needed.length) return;
    this.#drops++;
    // Predictable rhythm: every other drop is something the recipe still needs.
    const useNeeded = this.#drops % 2 === 1 || Math.random() < 0.35;
    const extras = EXTRAS.filter((id) => !(id in this.#recipe.items));
    const id = useNeeded ? needed[this.#drops % needed.length] : extras[Math.floor(Math.random() * extras.length)];
    if (useNeeded) this.#neededDropped++;
    const lanes = [0.24, 0.38, 0.52, 0.66, 0.78];
    let lane;
    do { lane = Math.floor(Math.random() * lanes.length); } while (lane === this.#lastLane);
    this.#lastLane = lane;
    this.#items.push({ id, x: lanes[lane], y: -0.08, t: 0, phase: Math.random() * 6, needed: useNeeded });
  }

  #catch(it, x) {
    const s = this.#shell;
    const food = FOODS[it.id];
    const want = this.#recipe.items[it.id];
    if (want && (this.#have[it.id] ?? 0) < want) {
      this.#have[it.id] += 1;
      this.#neededCaught++;
      recordMetrics('kitchen', { poseSuccesses: 1 });
      audio.sfx('pop');
      s.burst(x, BASKET_Y - 0.04, 10);
      s.banner(`+1 ${food.name} · ${GROUPS[food.group].name}!`, 'is-win');
      this.#renderCard();
      if (!this.#needed().length) { this.#cook(); return; }
      if (!s.speaking && Math.random() < 0.4) s.say(`${cap(food.name)}! That's a ${GROUPS[food.group].name.toLowerCase()}.`);
      return;
    }
    // Not needed (or already have enough): teach, don't penalise.
    this.#extras++;
    audio.sfx('soft');
    const already = Boolean(want);
    s.banner(already ? `We have enough ${food.plural}!` : `${cap(food.name)} isn't in this recipe`, 'is-soft');
    if (this.#phaseT - this.#lastExtraLine > 6 && !s.speaking) {
      this.#lastExtraLine = this.#phaseT;
      const next = this.#needed()[0];
      s.say(already
        ? `We already have enough ${food.plural}. Let's find ${FOODS[next].plural}!`
        : `${food.line} It's not in our ${this.#recipe.name} today. Let's look for ${FOODS[next].plural}!`);
    }
  }

  #cook() {
    const s = this.#shell;
    const r = this.#recipe;
    this.#items = [];
    audio.sfx('sparkle');
    s.burst(0.5, 0.5, 36);
    s.guide.playAnimation('celebrate');
    s.banner(`${r.name} is ready!`, 'is-win');
    s.progress(this.#rIndex, [...Array(this.#rIndex + 1).keys()]);
    const groups = [...new Set(Object.keys(r.items).map((id) => GROUPS[FOODS[id].group].name))];
    s.showCard({ art: mealArt(r), kicker: 'Recipe complete!', name: r.name, chip: groups.join(' · '), fact: r.finish });
    s.say(`Yum! Our ${r.name} is ready! ${r.finish}`);
    this.#setPhase('cook');
  }

  #nextRecipe() {
    if (this.#rIndex + 1 < this.#recipes.length) { this.#startRecipe(this.#rIndex + 1); return; }
    this.#finish();
  }

  #finish() {
    if (this.#phase === 'done') return;
    this.#setPhase('done');
    this.#shell.hideCard();
    const seconds = Math.round((performance.now() - this.#startedAt) / 1000);
    recordMetrics('kitchen', { secondsPlayed: seconds, poseAttempts: this.#neededDropped });
    const newCards = addDiscoveries(this.#recipes.map((r) => `kitchen:${r.id}`));
    const ratio = this.#neededCaught / Math.max(1, this.#neededDropped);
    const level = this.#level;
    const next = ratio >= 0.75 ? Math.min(3, level + 1) : ratio < 0.4 ? Math.max(1, level - 1) : level;
    setWorldLevel('kitchen', next);

    this.#onComplete({
      stats: { neededDropped: this.#neededDropped, neededCaught: this.#neededCaught, extras: this.#extras },
      seconds,
      newDiscoveries: newCards,
      level: { from: level, to: next },
      score: { done: this.#recipes.length, total: this.#recipes.length, label: 'recipes cooked' },
      learned: this.#recipes.map((r) => ({ id: `kitchen:${r.id}`, art: mealArt(r), title: r.name, sub: `${Object.values(r.items).reduce((a, b) => a + b, 0)} ingredients` })),
      question: this.#level === 1 ? this.#countingQuestion() : this.#groupQuestion(),
    });
  }

  /** Level 1: counting — "How many bananas went into the fruit salad?" */
  #countingQuestion() {
    const r = this.#recipes[0];
    const [id, n] = Object.entries(r.items).find(([, c]) => c >= 2) ?? Object.entries(r.items)[0];
    const name = FOODS[id].plural;
    return {
      prompt: `How many ${name} went into the ${r.name}?`,
      hint: `Look at the recipe card in your head… we caught ${name} more than once!`,
      answer: String(n),
      explain: `Yes! We needed ${n} ${name}.`,
      options: [1, 2, 3].map((k) => ({ id: String(k), label: `${k}`, art: countArt(id, k) })),
    };
  }

  /** Level 2+: food groups — "Which of these is a vegetable?" */
  #groupQuestion() {
    const veg = ['carrot', 'broccoli']; // (tomatoes are left out: they grow like a fruit)
    const answer = veg[(getWorldProgress('kitchen')?.metrics.sessions ?? 0) % veg.length];
    const others = ['banana', 'cheese', 'bread', 'egg'].slice(0, 2);
    const opts = [answer, ...others].sort();
    return {
      prompt: 'Which of these is a vegetable?',
      hint: 'Vegetables are plants we eat, like roots, leaves and stalks.',
      answer,
      explain: `Yes! The ${FOODS[answer].name} is a vegetable. ${FOODS[answer].line}`,
      options: opts.map((id) => ({ id, label: cap(FOODS[id].name), art: foodSvg(id) })),
    };
  }

  #onClick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'card-next' && this.#phase === 'cook') { audio.sfx('tap'); this.#nextRecipe(); }
  };

  #drawBasket(ctx, w, h) {
    const x = this.#basketX * w, y = BASKET_Y * h;
    const bw = BASKET_HALF * w;
    const bh = h * 0.07;
    ctx.save();
    ctx.fillStyle = 'rgba(43,42,76,0.15)';
    ctx.beginPath(); ctx.ellipse(x, y + bh + 6, bw * 0.95, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9a05a';
    ctx.beginPath();
    ctx.moveTo(x - bw, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw * 0.8, y + bh); ctx.lineTo(x - bw * 0.8, y + bh); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b77d3e'; ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - bw + (i * bw) / 2, y); ctx.lineTo(x - bw * 0.8 + (i * bw * 0.8) / 2, y + bh); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - bw * 0.9, y + bh * 0.5); ctx.lineTo(x + bw * 0.9, y + bh * 0.5); ctx.stroke();
    ctx.fillStyle = '#c4884a';
    ctx.fillRect(x - bw * 1.05, y - 6, bw * 2.1, 10);
    ctx.restore();
  }
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function countArt(id, n) {
  const inner = foodSvg(id).replace(/<svg[^>]*>|<\/svg>/g, '');
  const icons = Array.from({ length: n }, (_, i) => `<g transform="translate(${10 + i * 34} 64) scale(0.3)">${inner}</g>`).join('');
  return `<svg viewBox="0 0 120 100" aria-hidden="true">
    <text x="60" y="54" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="52" fill="#e9785a">${n}</text>
    ${icons}
  </svg>`;
}
