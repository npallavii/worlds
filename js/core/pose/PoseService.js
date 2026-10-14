// Pose tracking service — one shared instance for the whole app.
//
// Sources:
//   'camera' — webcam + MediaPipe Tasks Vision Pose Landmarker (runs fully on-device)
//   'sim'    — SimulatedPose (mouse/keyboard), same frame format
//
// Inference runs in its own timer loop at ~TARGET_HZ, separate from the render loop:
// worlds read `pose.latest` each animation frame instead of running inference per frame.
//
// Privacy: frames are only read into the on-device model. Nothing is recorded,
// stored, or uploaded. stop() releases the camera (the browser's camera light turns off).
import { LANDMARK_COUNT, LM, bodyMetrics, isVisible, toView } from './landmarks.js';
import { OneEuroFilter } from './OneEuroFilter.js';
import { SimulatedPose } from './SimulatedPose.js';

// Verified 2026-10-14: package files and model URLs return 200; API checked against vision.d.ts.
export const MEDIAPIPE_VERSION = '0.10.35';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const TARGET_HZ = 20;
const LOST_AFTER_MS = 1200;

/** Friendly, child/parent-facing explanations for every failure we can detect. */
export const POSE_ERRORS = {
  unsupported: { title: "This browser can't use the camera", body: 'Try the latest Chrome, Edge, Safari or Firefox. You can still play with the mouse and keyboard.' },
  insecure: { title: 'The camera needs a secure page', body: 'Open the game from an https:// address or from localhost.' },
  denied: { title: 'The camera is switched off for this game', body: 'A grown-up can allow it: click the camera icon in the address bar, choose "Allow", then press Try again.' },
  noCamera: { title: "We couldn't find a camera", body: 'Plug in a webcam, or play with the mouse and keyboard instead.' },
  inUse: { title: 'The camera is busy', body: 'Close other apps or tabs that are using the camera (like video calls), then press Try again.' },
  modelFailed: { title: "The body tracker didn't load", body: 'Check the internet connection and press Try again, or play with the mouse and keyboard.' },
};

class PoseError extends Error {
  constructor(code, cause) { super(code); this.code = code; this.cause = cause; }
}

function classifyMediaError(err) {
  switch (err?.name) {
    case 'NotAllowedError': case 'SecurityError': return 'denied';
    case 'NotFoundError': case 'OverconstrainedError': case 'DevicesNotFoundError': return 'noCamera';
    case 'NotReadableError': case 'AbortError': case 'TrackStartError': return 'inUse';
    default: return 'inUse';
  }
}

class PoseService {
  status = 'idle';              // idle | starting | running | paused | error
  source = null;                // 'camera' | 'sim' | null
  latest = null;                // most recent PoseFrame (see #publish)
  calibration = null;           // set by the calibration state
  hz = 0;                       // measured inference rate

  #landmarkerPromise = null;
  #landmarker = null;
  #video = null;
  #stream = null;
  #sim = null;
  #timer = null;
  #listeners = new Set();
  #filters = Array.from({ length: LANDMARK_COUNT }, () => ({ x: new OneEuroFilter(), y: new OneEuroFilter() }));
  #lastTs = 0;
  #gen = 0; // bumps on stop(); async starts abandon themselves if it changed
  #lastGood = 0;
  #rateWindow = [];

  get video() { return this.#video; }
  get isActive() { return this.status === 'running' || this.status === 'paused'; }

  onFrame(fn) { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }

  /** Preload the model (safe to call early; cached). */
  loadModel() {
    if (!this.#landmarkerPromise) {
      this.#landmarkerPromise = (async () => {
        const { FilesetResolver, PoseLandmarker } = await import(`${CDN}/vision_bundle.mjs`);
        const fileset = await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
        const options = (delegate) => ({
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        try {
          return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
        } catch (gpuErr) {
          console.warn('[pose] GPU delegate unavailable, using CPU', gpuErr);
          return await PoseLandmarker.createFromOptions(fileset, options('CPU'));
        }
      })().catch((err) => {
        this.#landmarkerPromise = null; // allow "Try again"
        throw new PoseError('modelFailed', err);
      });
    }
    return this.#landmarkerPromise;
  }

  /** Requests the webcam (call only from a user action) and starts tracking. */
  async startCamera({ onProgress } = {}) {
    this.stop();
    const gen = this.#gen;
    const abandoned = () => gen !== this.#gen;
    if (!window.isSecureContext) throw new PoseError('insecure');
    if (!navigator.mediaDevices?.getUserMedia) throw new PoseError('unsupported');
    this.status = 'starting';

    try {
      onProgress?.('camera');
      const modelPromise = this.loadModel(); // download in parallel with the permission prompt
      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        });
      } catch (err) {
        modelPromise.catch(() => {}); // keep loading in background; don't surface as unhandled
        throw new PoseError(classifyMediaError(err), err);
      }

      if (abandoned()) { this.#stream.getTracks().forEach((t) => t.stop()); this.#stream = null; return; }
      const video = this.#ensureVideo();
      video.srcObject = this.#stream;
      await video.play();

      onProgress?.('model');
      this.#landmarker = await modelPromise;
      if (abandoned()) return;
      this.source = 'camera';
      this.#beginLoop();
    } catch (err) {
      if (abandoned()) return;
      this.stop();
      this.status = 'error';
      throw err instanceof PoseError ? err : new PoseError('inUse', err);
    }
  }

  /** Starts the mouse/keyboard simulation source. */
  startSimulation() {
    this.stop();
    this.#sim = new SimulatedPose();
    this.#sim.start();
    this.source = 'sim';
    this.#beginLoop();
  }

  pause() {
    if (this.status !== 'running') return;
    clearTimeout(this.#timer);
    this.#timer = null;
    this.status = 'paused';
  }

  resume() {
    if (this.status !== 'paused') return;
    this.#beginLoop();
  }

  /** Stops inference, releases the camera, and clears frames. Calibration is kept for the session. */
  stop() {
    this.#gen++;
    clearTimeout(this.#timer);
    this.#timer = null;
    this.#stream?.getTracks().forEach((t) => t.stop());
    this.#stream = null;
    if (this.#video) { this.#video.pause(); this.#video.srcObject = null; this.parkPreview(); }
    this.#sim?.stop();
    this.#sim = null;
    this.source = null;
    this.latest = null;
    this.hz = 0;
    this.#filters.forEach((f) => { f.x.reset(); f.y.reset(); });
    if (this.status !== 'error') this.status = 'idle';
  }

  /* ---------- Preview helpers ---------- */

  /** Shows the live (mirrored) camera image inside `container`. No-op in simulation. */
  attachPreview(container) {
    if (this.source !== 'camera' || !this.#video) return false;
    container.appendChild(this.#video); // moving a playing <video> within the document keeps it playing
    return true;
  }

  /** Moves the video back to its hidden holder so screen teardown can't remove it. */
  parkPreview() {
    if (this.#video && this.#video.parentElement?.id !== 'pose-holder') {
      document.getElementById('pose-holder').appendChild(this.#video);
    }
  }

  /** Maps a display-space landmark to pixel coordinates in a view of size w×h. */
  toView(p, w, h) {
    const v = this.#video;
    const camera = this.source === 'camera' && v?.videoWidth;
    return toView(p, camera ? v.videoWidth : w, camera ? v.videoHeight : h, w, h);
  }

  /* ---------- Inference loop ---------- */

  #ensureVideo() {
    if (!this.#video) {
      const v = document.createElement('video');
      v.className = 'pose-video';
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      this.#video = v;
      document.getElementById('pose-holder').appendChild(v);
    }
    return this.#video;
  }

  #beginLoop() {
    this.status = 'running';
    const interval = 1000 / TARGET_HZ;
    const tick = () => {
      if (this.status !== 'running') return;
      const started = performance.now();
      try {
        this.#step(started);
      } catch (err) {
        console.error('[pose] inference step failed', err);
      }
      // Keep a steady cadence; never schedule faster than the target rate.
      this.#timer = setTimeout(tick, Math.max(4, interval - (performance.now() - started)));
    };
    tick();
  }

  #step(now) {
    let raw = null;
    if (this.source === 'sim') {
      raw = this.#sim.sample(now / 1000);
    } else if (this.source === 'camera') {
      const v = this.#video;
      if (!v || v.readyState < 2 || !this.#landmarker) return;
      const ts = Math.max(now, this.#lastTs + 1); // timestamps must strictly increase
      const result = this.#landmarker.detectForVideo(v, ts);
      const lm = result?.landmarks?.[0];
      // Mirror once here so the whole app works in display space.
      raw = lm ? lm.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 })) : null;
    }
    this.#publish(raw, now);
  }

  #publish(raw, now) {
    const dt = this.#lastTs ? (now - this.#lastTs) / 1000 : 0;
    this.#lastTs = now;
    this.#rateWindow.push(now);
    while (this.#rateWindow.length && now - this.#rateWindow[0] > 1000) this.#rateWindow.shift();
    this.hz = this.#rateWindow.length;

    let landmarks = null;
    if (raw) {
      landmarks = raw.map((p, i) => {
        const f = this.#filters[i];
        return { x: f.x.filter(p.x, dt), y: f.y.filter(p.y, dt), z: p.z, visibility: p.visibility };
      });
    } else {
      this.#filters.forEach((f) => { f.x.reset(); f.y.reset(); });
    }

    const quality = assessFrame(landmarks);
    if (quality.inFrame) this.#lastGood = now;
    const frame = {
      t: now,
      source: this.source,
      landmarks,
      metrics: landmarks ? bodyMetrics(landmarks) : null,
      ...quality,
      lost: now - this.#lastGood > LOST_AFTER_MS,
    };
    this.latest = frame;
    for (const fn of this.#listeners) fn(frame);
  }
}

/**
 * Framing check: is a whole-enough body visible, and is the child too close / far / off-side?
 * Returns { inFrame, confidence, issue } where issue is null or one of
 * 'noPerson' | 'tooClose' | 'tooFar' | 'moveLeft' | 'moveRight'.
 */
export function assessFrame(lm) {
  if (!lm) return { inFrame: false, confidence: 0, issue: 'noPerson' };
  const key = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP];
  const confidence = key.reduce((s, i) => s + (lm[i].visibility ?? 0), 0) / key.length;
  const m = bodyMetrics(lm);
  if (!m || confidence < 0.45) return { inFrame: false, confidence, issue: 'noPerson' };
  if (m.shoulderWidth > 0.42 || !m.hipsVisible) return { inFrame: false, confidence, issue: 'tooClose' };
  if (m.shoulderWidth < 0.07) return { inFrame: false, confidence, issue: 'tooFar' };
  // Display space is mirrored: if the body is near the left edge, the child should step to their right… which
  // appears as moving toward screen centre. Phrase hints in screen terms children can follow.
  if (m.torsoMid.x < 0.18) return { inFrame: false, confidence, issue: 'moveRight' };
  if (m.torsoMid.x > 0.82) return { inFrame: false, confidence, issue: 'moveLeft' };
  return { inFrame: true, confidence, issue: null, wristsVisible: isVisible(lm[LM.L_WRIST], 0.4) && isVisible(lm[LM.R_WRIST], 0.4) };
}

export const ISSUE_HINTS = {
  noPerson: "I can't see you yet. Stand in front of the camera!",
  tooClose: 'Take two big steps back so I can see your whole body.',
  tooFar: 'Come a little closer to the camera.',
  moveRight: 'Move a little toward the middle — that way!',
  moveLeft: 'Move a little toward the middle — that way!',
};

export const pose = new PoseService();
