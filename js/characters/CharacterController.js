// Reusable character animation controller for any rig built with the shared part names
// (see clips.js). Usage:
//   const bloop = createCharacter(BLOOP, mountEl);
//   bloop.playAnimation('wave');            // → Promise<'done' | 'interrupted'>
//   await bloop.say('Hello!');              // talks + captions + speech, then idles
//   bloop.destroy();                        // removes its frame task; call on screen exit
import { addTask } from '../core/scheduler.js';
import { getSettings } from '../core/settings.js';
import { audio } from '../core/audio.js';
import { BASE_POSE, CLIPS } from './clips.js';

const NUMERIC = Object.keys(BASE_POSE).filter((k) => typeof BASE_POSE[k] === 'number');
let instanceCount = 0;

/** Characters currently mounted (used by the ?debug panel to verify cleanup). */
export const liveCharacters = new Set();

export class CharacterController {
  #def; #el; #parts; #removeTask;
  #pose = { ...BASE_POSE };
  #clip = null; #clipName = ''; #clipOpts = {}; #clipTime = 0; #clipToken = 0; #resolveClip = null;
  #blinkIn = 2; #blinkT = -1; #idleFor = 0; #nextLook = 8;

  constructor(def, mount) {
    this.#def = def;
    this.id = `${def.id}-${++instanceCount}`;
    this.name = def.name;
    mount.innerHTML = def.svg(this.id);
    this.#el = mount.querySelector('svg');
    this.#parts = {};
    this.#el.querySelectorAll('[data-part]').forEach((n) => { this.#parts[n.dataset.part] = n; });
    this.playAnimation('idle');
    this.#removeTask = addTask(`character:${this.id}`, (dt) => this.#update(dt));
    liveCharacters.add(this);
  }

  get element() { return this.#el; }
  get currentAnimation() { return this.#clipName; }

  playAnimation(name, opts = {}) {
    const clip = CLIPS[name];
    if (!clip) throw new Error(`Unknown animation "${name}"`);
    this.#resolveClip?.('interrupted');
    this.#clip = clip;
    this.#clipName = name;
    this.#clipOpts = opts;
    this.#clipTime = 0;
    this.#clipToken++;
    this.#el.dataset.anim = name;
    if (name !== 'idle') this.#idleFor = 0;
    return new Promise((resolve) => { this.#resolveClip = resolve; });
  }

  /** Talk animation + caption + speech; returns to idle when the line ends. */
  async say(text, { then = 'idle' } = {}) {
    this.playAnimation('talk');
    const token = this.#clipToken;
    const result = await audio.speak(text, { speaker: this.name });
    if (token === this.#clipToken) this.playAnimation(then);
    return result;
  }

  destroy() {
    this.#removeTask();
    liveCharacters.delete(this);
    this.#resolveClip?.('interrupted');
    this.#resolveClip = null;
  }

  #update(dt) {
    const reduced = getSettings().reducedMotion;
    this.#clipTime += dt;

    // Finish one-shot clips and fall back to idle.
    if (!this.#clip.loop && this.#clipTime >= this.#clip.duration) {
      const resolve = this.#resolveClip;
      this.#resolveClip = null;
      if (this.#clipOpts.hold) {
        this.#clipTime = this.#clip.duration;
      } else {
        this.playAnimation('idle');
        this.#resolveClip = null; // idle never "completes"
      }
      resolve?.('done');
    }

    // Occasional look-around keeps idle characters alive.
    if (this.#clipName === 'idle' && !reduced) {
      this.#idleFor += dt;
      if (this.#idleFor > this.#nextLook) {
        this.#nextLook = 7 + Math.random() * 5;
        this.playAnimation('lookAround');
      }
    }

    const target = { ...BASE_POSE, ...this.#clip.pose(this.#clipTime, this.#clipOpts) };
    const amp = reduced ? 0.45 : 1;
    const k = Math.min(1, Math.max(0, 1 - Math.exp(-dt * (reduced ? 7 : 13)))); // blend factor, always 0–1
    for (const key of NUMERIC) {
      const goal = BASE_POSE[key] + (target[key] - BASE_POSE[key]) * (key === 'mouthOpen' ? 1 : amp);
      this.#pose[key] += (goal - this.#pose[key]) * k;
    }
    this.#pose.eyes = target.eyes;
    this.#pose.mouth = target.mouth;

    this.#render(this.#blink(dt));
  }

  #blink(dt) {
    if (this.#blinkT >= 0) {
      this.#blinkT += dt;
      if (this.#blinkT > 0.16) { this.#blinkT = -1; this.#blinkIn = 2.2 + Math.random() * 3.3; }
      else return 1 - Math.sin((this.#blinkT / 0.16) * Math.PI) * 0.92;
    } else if ((this.#blinkIn -= dt) <= 0) {
      this.#blinkT = 0;
    }
    return 1;
  }

  #render(blink) {
    const p = this.#pose;
    const P = this.#parts;
    const { pivots: v } = this.#def;
    const set = (part, tf) => P[part]?.setAttribute('transform', tf);

    // Squash/stretch and lean pivot on the feet so the character stays grounded.
    set('root', `translate(0 ${p.y.toFixed(2)}) rotate(${p.rot.toFixed(2)} ${v.ground}) translate(${v.ground}) scale(${p.sx.toFixed(4)} ${p.sy.toFixed(4)}) translate(${negate(v.ground)})`);
    set('shadow', `translate(${v.ground}) scale(${(1 + p.y / 80).toFixed(3)} 1) translate(${negate(v.ground)})`);
    set('head', `translate(0 ${p.headY.toFixed(2)}) rotate(${p.headRot.toFixed(2)} ${v.neck})`);
    set('armL', `rotate(${p.armL.toFixed(2)} ${v.shoulderL})`);
    set('armR', `rotate(${(-p.armR).toFixed(2)} ${v.shoulderR})`);
    set('forearmL', `rotate(${p.elbowL.toFixed(2)} ${v.elbowL})`);
    set('forearmR', `rotate(${(-p.elbowR).toFixed(2)} ${v.elbowR})`);
    set('legL', `rotate(${p.legL.toFixed(2)} ${v.hipL})`);
    set('legR', `rotate(${(-p.legR).toFixed(2)} ${v.hipR})`);
    set('antenna', `rotate(${p.antenna.toFixed(2)} ${v.antenna})`);
    set('eyes', `translate(${p.eyeX.toFixed(2)} ${p.eyeY.toFixed(2)})`);

    const happy = p.eyes === 'happy';
    for (const side of ['L', 'R']) {
      set(`eye${side}`, `translate(${v[`eye${side}`]}) scale(1 ${happy ? 1 : blink.toFixed(3)}) translate(${negate(v[`eye${side}`])})`);
      P[`eyeOpen${side}`]?.setAttribute('opacity', happy ? 0 : 1);
      P[`eyeHappy${side}`]?.setAttribute('opacity', happy ? 1 : 0);
    }

    const talking = p.mouthOpen > 0.06;
    P.mouthSmile?.setAttribute('opacity', !talking && p.mouth === 'smile' ? 1 : 0);
    P.mouthGrin?.setAttribute('opacity', !talking && p.mouth === 'grin' ? 1 : 0);
    P.mouthOpen?.setAttribute('opacity', talking ? 1 : 0);
    P.mouthOpen?.setAttribute('ry', (2 + Math.max(0, Math.min(1, p.mouthOpen)) * 8).toFixed(2));
  }
}

function negate(pair) {
  return pair.split(' ').map((n) => -Number(n)).join(' ');
}

export function createCharacter(def, mount) {
  return new CharacterController(def, mount);
}
