// Audio controller: synthesized sound effects (Web Audio API — no external audio files to
// license), optional soft music, and spoken instructions via speechSynthesis with captions.
//
// Dialogue rule: only one line plays at a time. speak() always cancels the previous line,
// and the previous line's promise resolves with 'interrupted'.
import { getSettings, onSettingsChange } from './settings.js';

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C major pentatonic

class AudioController {
  #ctx = null;
  #master = null;
  #sfxBus = null;
  #musicBus = null;
  #musicTimer = null;
  #musicNextAt = 0;
  #musicStep = 2;
  #speechToken = 0;
  #pendingFinish = null;
  #fallbackTimer = null;
  #captionHideTimer = null;

  constructor() {
    onSettingsChange((s, patch) => {
      this.#applyVolume();
      if ('music' in patch || 'muted' in patch) (s.music && !s.muted ? this.startMusic() : this.stopMusic());
      if ('captions' in patch && !s.captions) this.#hideCaption(0);
      if (('voice' in patch && !s.voice) || ('muted' in patch && s.muted)) window.speechSynthesis?.cancel();
    });
  }

  /** Must be called from a user gesture (browser autoplay policy). Safe to call repeatedly. */
  unlock() {
    if (!this.#ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.#ctx = new AC();
      this.#master = this.#ctx.createGain();
      this.#master.connect(this.#ctx.destination);
      this.#sfxBus = this.#ctx.createGain();
      this.#sfxBus.connect(this.#master);
      this.#musicBus = this.#ctx.createGain();
      this.#musicBus.gain.value = 0.35;
      this.#musicBus.connect(this.#master);
      this.#applyVolume();
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    const s = getSettings();
    if (s.music && !s.muted) this.startMusic();
  }

  #applyVolume() {
    if (!this.#ctx) return;
    const s = getSettings();
    const v = s.muted ? 0 : (s.volume / 100) ** 1.5; // perceptual curve
    this.#master.gain.setTargetAtTime(v, this.#ctx.currentTime, 0.05);
  }

  /* ---------------- Sound effects ---------------- */

  #tone({ freq, to = freq, start = 0, dur = 0.15, type = 'sine', gain = 0.3, bus = this.#sfxBus }) {
    const ctx = this.#ctx;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  #noiseSweep(dur = 0.4) {
    const ctx = this.#ctx;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    const t0 = ctx.currentTime;
    filter.frequency.setValueAtTime(400, t0);
    filter.frequency.exponentialRampToValueAtTime(2400, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.#sfxBus);
    src.start(t0);
  }

  sfx(name) {
    if (!this.#ctx || getSettings().muted) return;
    switch (name) {
      case 'tap': this.#tone({ freq: 620, to: 900, dur: 0.09, gain: 0.18 }); break;
      case 'pop': this.#tone({ freq: 380, to: 980, dur: 0.13, type: 'triangle', gain: 0.25 }); break;
      case 'whoosh': this.#noiseSweep(0.42); break;
      case 'chime':
        this.#tone({ freq: 880, dur: 0.7, gain: 0.2 });
        this.#tone({ freq: 1320, start: 0.09, dur: 0.8, gain: 0.14 });
        break;
      case 'sparkle':
        [1046.5, 1318.5, 1568, 2093].forEach((f, i) => this.#tone({ freq: f, start: i * 0.07, dur: 0.35, gain: 0.12 }));
        break;
      case 'soft':
        this.#tone({ freq: 440, to: 392, dur: 0.3, type: 'triangle', gain: 0.14 });
        break;
      default: console.warn(`[audio] unknown sfx "${name}"`);
    }
  }

  /* ---------------- Music ---------------- */

  startMusic() {
    if (!this.#ctx || this.#musicTimer) return;
    this.#musicNextAt = this.#ctx.currentTime + 0.1;
    // Lookahead scheduler: plan notes slightly ahead so timing stays steady.
    this.#musicTimer = setInterval(() => {
      while (this.#musicNextAt < this.#ctx.currentTime + 0.6) {
        this.#musicStep = Math.max(0, Math.min(PENTATONIC.length - 1, this.#musicStep + [-1, 0, 1, 1, -1, 2, -2][Math.floor(Math.random() * 7)]));
        const start = this.#musicNextAt - this.#ctx.currentTime;
        this.#tone({ freq: PENTATONIC[this.#musicStep] / 2, start, dur: 0.9, gain: 0.09, bus: this.#musicBus });
        if (Math.random() < 0.3) this.#tone({ freq: PENTATONIC[0] / 4, start, dur: 1.6, gain: 0.06, bus: this.#musicBus });
        this.#musicNextAt += 0.55;
      }
    }, 200);
  }

  stopMusic() {
    clearInterval(this.#musicTimer);
    this.#musicTimer = null;
  }

  /* ---------------- Speech + captions ---------------- */

  #pickVoice() {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
    return en.find((v) => /natural|aria|jenny|google us|samantha|zira/i.test(v.name)) ?? en[0] ?? null;
  }

  /**
   * Speak a line with a caption. Resolves 'done' when finished or 'interrupted' if a newer
   * line replaced it. Works without speech synthesis (caption-only, timed by text length).
   */
  speak(text, { speaker = 'Bloop' } = {}) {
    this.stopSpeech();
    const token = this.#speechToken;
    const s = getSettings();
    if (s.captions) this.#showCaption(speaker, text);

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(this.#fallbackTimer);
        const current = token === this.#speechToken;
        if (current) { this.#pendingFinish = null; this.#hideCaption(900); }
        resolve(current ? 'done' : 'interrupted');
      };
      this.#pendingFinish = finish;

      const estimateMs = 900 + text.split(/\s+/).length * 360;
      const canSpeak = s.voice && !s.muted && 'speechSynthesis' in window;
      if (canSpeak) {
        const u = new SpeechSynthesisUtterance(text);
        const voice = this.#pickVoice();
        if (voice) u.voice = voice;
        u.rate = 0.95;
        u.pitch = 1.15;
        u.volume = Math.max(0.1, s.volume / 100);
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);
        // Some browsers occasionally never fire onend; never leave a character stuck talking.
        this.#fallbackTimer = setTimeout(finish, estimateMs * 2 + 1500);
      } else {
        this.#fallbackTimer = setTimeout(finish, estimateMs);
      }
    });
  }

  stopSpeech() {
    this.#speechToken++;
    const finish = this.#pendingFinish;
    this.#pendingFinish = null;
    window.speechSynthesis?.cancel();
    finish?.();
    this.#hideCaption(0);
  }

  #showCaption(speaker, text) {
    clearTimeout(this.#captionHideTimer);
    const bar = document.getElementById('caption-bar');
    document.getElementById('caption-speaker').textContent = `${speaker}:`;
    document.getElementById('caption-text').textContent = text;
    bar.hidden = false;
    // Restart the entrance animation for each new line.
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = '';
  }

  #hideCaption(delay) {
    clearTimeout(this.#captionHideTimer);
    this.#captionHideTimer = setTimeout(() => { document.getElementById('caption-bar').hidden = true; }, delay);
  }
}

export const audio = new AudioController();
