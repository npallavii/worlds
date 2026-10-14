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
      case 'freeze':
        this.#tone({ freq: 880, to: 330, dur: 0.35, type: 'triangle', gain: 0.18 });
        this.#tone({ freq: 1318.5, start: 0.32, dur: 0.6, gain: 0.14 });
        break;
      case 'coin':
        this.#tone({ freq: 988, dur: 0.08, type: 'square', gain: 0.06 });
        this.#tone({ freq: 1318.5, start: 0.07, dur: 0.3, type: 'square', gain: 0.06 });
        break;
      default: console.warn(`[audio] unknown sfx "${name}"`);
    }
  }

  #noise() {
    if (!this.#noiseBuf) {
      const ctx = this.#ctx;
      this.#noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.#noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.#noiseBuf;
  }

  #hit({ start, dur, type = 'bandpass', freq = 1800, gain = 0.15, bus }) {
    const ctx = this.#ctx;
    const t0 = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = this.#noise();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t0, Math.random() * 0.5, dur + 0.05);
  }

  /* ---------------- Gameplay dance beat ----------------
     Not tied to the "background music" setting: in Safari the music stopping IS the freeze
     cue. It still follows volume and mute, and the screen always shows a visual cue too. */

  #noiseBuf = null;
  #beatBus = null;
  #beatTimer = null;
  #beatNext = 0;
  #beatStep = 0;

  startBeat({ bpm = 112 } = {}) {
    if (!this.#ctx || this.#beatTimer) return;
    if (!this.#beatBus) {
      this.#beatBus = this.#ctx.createGain();
      this.#beatBus.connect(this.#master);
    }
    this.#beatBus.gain.cancelScheduledValues(this.#ctx.currentTime);
    this.#beatBus.gain.setValueAtTime(0.55, this.#ctx.currentTime);
    const sixteenth = 60 / bpm / 4;
    const BASS = [130.81, 110.0, 87.31, 98.0];             // C3 A2 F2 G2, one bar each
    const MELODY = [523.25, 587.33, 659.25, 783.99, 880];  // pentatonic
    this.#beatNext = this.#ctx.currentTime + 0.05;
    this.#beatStep = 0;
    this.#beatTimer = setInterval(() => {
      const bus = this.#beatBus;
      while (this.#beatNext < this.#ctx.currentTime + 0.25) {
        const s = this.#beatStep % 16;
        const bar = Math.floor(this.#beatStep / 16) % 4;
        const at = this.#beatNext - this.#ctx.currentTime;
        if (s === 0 || s === 8 || s === 10) this.#tone({ freq: 150, to: 45, start: at, dur: 0.22, gain: 0.5, bus });
        if (s === 4 || s === 12) this.#hit({ start: at, dur: 0.12, freq: 1800, gain: 0.16, bus });
        if (s % 2 === 0) this.#hit({ start: at, dur: 0.04, type: 'highpass', freq: 7000, gain: 0.05, bus });
        if ([0, 3, 6, 8, 11, 14].includes(s)) this.#tone({ freq: BASS[bar], start: at, dur: sixteenth * 1.6, type: 'triangle', gain: 0.2, bus });
        if (s % 4 === 2 && (this.#beatStep * 7) % 5 < 3) this.#tone({ freq: MELODY[(this.#beatStep * 3) % MELODY.length], start: at, dur: 0.18, gain: 0.07, bus });
        this.#beatNext += sixteenth;
        this.#beatStep++;
      }
    }, 60);
  }

  stopBeat() {
    clearInterval(this.#beatTimer);
    this.#beatTimer = null;
    if (this.#beatBus && this.#ctx) {
      // Cut quickly (already-scheduled notes fade out in ~80 ms) so "music stopped" is unmistakable.
      const t = this.#ctx.currentTime;
      this.#beatBus.gain.cancelScheduledValues(t);
      this.#beatBus.gain.setValueAtTime(this.#beatBus.gain.value, t);
      this.#beatBus.gain.linearRampToValueAtTime(0, t + 0.08);
    }
  }

  get beatPlaying() { return this.#beatTimer !== null; }

  /** Short, friendly synthesized animal calls. */
  animal(name) {
    if (!this.#ctx || getSettings().muted) return;
    const ctx = this.#ctx;
    const t0 = ctx.currentTime;
    if (name === 'elephant') {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t0);
      osc.frequency.linearRampToValueAtTime(620, t0 + 0.25);
      osc.frequency.linearRampToValueAtTime(470, t0 + 0.9);
      lfo.frequency.value = 18; lfoGain.gain.value = 25;
      lfo.connect(lfoGain).connect(osc.frequency);
      filter.type = 'lowpass'; filter.frequency.value = 1600;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95);
      osc.connect(filter).connect(g).connect(this.#sfxBus);
      osc.start(t0); lfo.start(t0); osc.stop(t0 + 1); lfo.stop(t0 + 1);
    } else if (name === 'giraffe') {
      // Giraffes have been recorded humming at night — a soft low hum.
      [0, 0.45].forEach((d) => this.#tone({ freq: 98, to: 92, start: d, dur: 0.4, type: 'triangle', gain: 0.25 }));
      this.#tone({ freq: 196, start: 0, dur: 0.85, gain: 0.05 });
    } else if (name === 'flamingo') {
      [0, 0.17, 0.34].forEach((d) => this.#tone({ freq: 560, to: 470, start: d, dur: 0.12, type: 'square', gain: 0.07 }));
    } else if (name === 'roar') {
      this.#tone({ freq: 140, to: 80, dur: 0.7, type: 'sawtooth', gain: 0.1 });
      this.#hit({ start: 0, dur: 0.6, type: 'lowpass', freq: 500, gain: 0.25, bus: this.#sfxBus });
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
