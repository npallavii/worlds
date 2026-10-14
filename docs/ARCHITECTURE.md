# Active Play Worlds: Architecture & Design Spec

> "The character is the teacher, the world is the classroom, and the child's body is the controller."

## 1. Architecture plan

The app is plain HTML, CSS and ES modules with no build step. The work is split into four layers:

```
┌──────────────────────────────────────────────────────────────┐
│ States (js/states/)   one module per game state: UI + flow   │
├──────────────────────────────────────────────────────────────┤
│ Worlds (js/worlds/, M3–M4)   initialize/start/update/render/ │
│                              pause/resume/destroy            │
├──────────────────────────────────────────────────────────────┤
│ Characters (js/characters/)  shared rig + clip library       │
├──────────────────────────────────────────────────────────────┤
│ Core engine (js/core/)                                       │
│  stateMachine · scheduler (single rAF) · audio · settings    │
│  progress · storage · [M2] pose service · input · collision  │
│  [M3+] timer · scoring · questions · adaptive rules          │
└──────────────────────────────────────────────────────────────┘
```

Rules that keep it maintainable:

1. **There is only one `requestAnimationFrame` loop** (`core/scheduler.js`). Characters, parallax and world update/render register tasks with it by id. Registering an id that already exists replaces the old task, so a duplicate loop can't happen.
2. **Every state owns an `AbortController`.** Listeners are added with `{ signal }`, and the state machine aborts the controller on exit, so handlers can't pile up across visits. `exit()` destroys characters and clears timers.
3. **Transitions are queued.** Rapid taps can't run two `enter()` calls at the same time.
4. **Gameplay tuning lives in data** (`js/data/worlds.js`), not in code.
5. **Pose inference runs separately from rendering** (M2). Inference runs at a capped rate (about 15–20 Hz) in its own loop. Game logic reads the latest smoothed landmarks, and rendering runs at display rate.

## 2. Folder structure

```
index.html                 entry page, global overlays (captions, pause, settings)
css/
  tokens.css               design tokens (colour, type, radius, motion)
  base.css                 buttons, overlays, settings, captions, reduced motion
  screens.css              per-screen layout + responsive rules
  character.css            character glow + ambient scenery motion
js/
  main.js                  wires states, pause/settings, ?debug panel
  core/
    stateMachine.js        STATES enum + queued transitions + AbortController per state
    scheduler.js           single rAF loop, pause support, task stats
    audio.js               Web Audio SFX, music, speech + captions (one line at a time)
    settings.js            accessibility/audio settings (persisted)
    progress.js            coins, completion, once-only reward claims (persisted)
    storage.js             failure-tolerant localStorage wrapper
    pose/
      PoseService.js       camera + MediaPipe, inference loop, smoothing, framing checks, errors
      SimulatedPose.js     mouse/keyboard source with the same 33-landmark output
      landmarks.js         landmark indices, body metrics, display→view (object-fit: cover) mapping
      poseDetectors.js     tolerant armsUp / armsWide / balance / neutral checks (in shoulder widths)
      OneEuroFilter.js     jitter smoothing
  characters/
    clips.js               shared rig pose channels + 12 animation clips
    CharacterController.js playAnimation(), say(), blink, blending, destroy()
    bloop.js               Bloop's layered SVG + joint pivots
  data/worlds.js           world configuration
  states/                  loading, welcome, hub, worldIntro (M1); cameraPermission, calibration, tutorial (M2)
  ui/                      screen mounting, scenery art, icons, parallax, pose stage + skeleton overlay
assets/                    icons/, characters/, audio/, models/ (see assets/README.md)
docs/ARCHITECTURE.md       this file
```

Planned additions: further world modules in `js/worlds/<id>/` (M4), `js/states/{treasure,parentSummary}.js` (M5).

## 3. Game-state design

```
loading ─► welcome ─► hub ◄──────────────────────────────────────────────┐
                      │                                                  │
                      ├─► worldIntro ─► cameraPermission ─► calibration  │
                      │        ▲             │ (denied → simulation mode)│
                      │        │             ▼                           │
                      │        │        tutorial ─► gameplay ─► checkpoint ─► victory ─► worldComplete
                      │        │                      │                                    │
                      │        └──────── pause overlay (any pausable state) ─► hub         │
                      ├─► treasure (after all 5 worlds)                                    │
                      └─► parentSummary                                       ◄────────────┘
```

| State | Milestone | Notes |
|---|---|---|
| loading, welcome, hub, worldIntro | **M1 ✔** | |
| pause | **M1 ✔** | Overlay. Freezes the scheduler and CSS ambience, stops speech. `P` / `Esc` / button. Auto-pauses when the tab is hidden |
| cameraPermission, calibration, tutorial (practice) | **M2 ✔** | Camera is only requested after the user taps. Failures offer **Try again** or simulation |
| gameplay, checkpoint, victory, worldComplete | **M3 ✔** | Generic hosts. Safari is the first world module; the others follow in M4 |
| treasure, parentSummary | M5 | |

A state is `{ enter(ctx), exit?(), pausable? }`, where `ctx = { params, signal, from, go }`.

## 4. Character system

All characters share the same rig channels: body `y/rot/squash`, `headRot/headY`, `armL/armR`, `elbowL/elbowR`, `legL/legR`, `antenna`, `eyeX/eyeY`, `mouthOpen`, plus `eyes` and `mouth` expressions. A character module only has to supply SVG with `data-part` names and joint pivots. The controller then provides:

- `playAnimation(name, opts)`, which returns `Promise<'done' | 'interrupted'>`
- Clips: `idle` (breathing and automatic blinking), `lookAround` (plays automatically when idle), `wave`, `talk`, `point`, `demonstrate {move: armsUp | armsWide | balance}`, `walk`, `happy`, `encourage`, `celebrate`, `farewell`
- `say(text)`, which plays the talk animation with a caption and speech, then returns to idle
- Exponential blending between poses so clip changes never snap
- Reduced motion: amplitude drops to 45% and blending is slower

## 5. Visual design specification

| Token | Value | Use |
|---|---|---|
| Ink | `#2b2a4c` | All body text (≥ 11:1 on cream) |
| Cream / Paper | `#fff8ec` / `#fffdf8` | Surfaces |
| Sun | `#ffc857` | Primary action |
| Coral, Mint, Teal, Lavender, Sky | soft accents | Status, chips |
| Bloop | blue `#3b8beb` → turquoise `#3ed1c8`, screen `#1d2550`, glow `#8ff4ff` | Character identity |
| Worlds | savanna gold · farm green/red · castle purple · sea blue · kitchen peach | One accent per world, used for card number, chips, intro border and step icons |

- **Type:** *Baloo 2* for display text (rounded and friendly), *Nunito* for body text, 17–20 px minimum.
- **Shape:** large radii (14/22/32 px), pill buttons with a 3D "press" edge, and touch targets of at least 56 px.
- **Depth:** scenery is drawn in four parallax layers (sky, far hills, mid hills, foreground). Cards use soft two-part shadows.
- **Motion:** easing is `cubic-bezier(.22,1,.36,1)`, with a gentle overshoot for pop-ins. Ambient loops take 3–50 s and there is no flashing. The reduced-motion setting disables all of it.
- **Copy:** short sentences that a beginning reader can manage. Every instruction is also spoken and captioned.

## 6. Pose tracking (Milestone 2)

**Library.** The app uses `@mediapipe/tasks-vision@0.10.35`, loaded with a dynamic `import()` from jsDelivr, together with the Pose Landmarker **Lite** float16 model from Google's model storage. On 2026-10-14 I checked that every file URL returns 200 and that the API matches the package's `vision.d.ts`: `FilesetResolver.forVisionTasks()`, `PoseLandmarker.createFromOptions()`, `detectForVideo(video, timestamp)` and `close()`. The newer 1.x release line has not been tested yet. Upgrading means re-checking that API.

```js
const { FilesetResolver, PoseLandmarker } = await import(`${CDN}/vision_bundle.mjs`);
const fileset = await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
const landmarker = await PoseLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },   // falls back to 'CPU'
  runningMode: 'VIDEO', numPoses: 1,
  minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
});
const result = landmarker.detectForVideo(video, timestampMs);   // result.landmarks[0] → 33 points
```

**Pipeline.**

```
getUserMedia (640×480, user-facing, after a tap)
  → detectForVideo at ~20 Hz in its own setTimeout loop (not the render loop)
  → mirror x once (x' = 1 − x) → "display space"
  → One Euro smoothing per landmark
  → assessFrame(): confidence, inFrame, issue (noPerson | tooClose | tooFar | moveLeft | moveRight)
  → pose.latest  ← screens and worlds read this every animation frame
```

**Coordinates.** Everything in the app works in mirrored display space (0–1), so the child's left hand appears on the left of the screen. `toView()` maps those points onto any element that shows the camera with `object-fit: cover`, taking the crop into account. Worlds should use `pose.toView(point, width, height)` to convert to canvas pixels.

**Robustness.**
- Distances are measured in shoulder widths, so the same thresholds work for any body size and distance from the camera.
- A pose must be **held** for 2 s, and wobbles shorter than 0.35 s don't reset the hold. One success is counted per hold, never once per frame.
- Calibration records the neutral standing position (shoulder midpoint, hip midpoint and shoulder width, averaged over 2 s). It is stored in `pose.calibration` and used for leaning and body-relative targets.
- If no good frame arrives for 1.2 s, the frame is marked `lost`. Practice then pauses and shows a repositioning hint.
- A slow camera or model start abandons itself if the user has already left the screen (a generation counter in `stop()` makes this possible).

**Lifecycle.** Tracking runs only in the camera states (`cameraPermission`, `calibration`, `tutorial`, and later `gameplay` and `checkpoint`). Entering any other state calls `pose.stop()`, which stops the media tracks, clears the inference timer and parks the `<video>` element. Pausing the game also pauses inference. The page's `pagehide` event stops tracking too.

## 7. Worlds (Milestone 3)

**Interface.** A world module lives in `js/worlds/<id>/` and is registered in `js/worlds/index.js`, where it is loaded on demand. It exports `createWorld({ root, config, onComplete })`, which returns an object with these methods:

| Method | Called by the gameplay host |
|---|---|
| `initialize()` | Once. Builds the world's DOM and characters inside `root` |
| `start()` | Once. Begins the first round |
| `update(dt, frame)` | Every animation frame (single scheduler task `world`). `frame` is `pose.latest` |
| `render()` | Every animation frame, after `update` |
| `pause()` / `resume()` | When the game is paused or resumed (button, `P`, or tab hidden) |
| `destroy()` | When leaving the gameplay state. Stops audio and removes characters and DOM |

When the world finishes it calls `onComplete(result)`. `result` contains:
- `stats`
- `seconds`
- `question`, a checkpoint question with `prompt`, `options`, `answer`, `hint` and `explain`
- `learned`, the discovery cards
- `score`, with `done`, `total` and `label`
- `level`, with `from` and `to`
- `newDiscoveries`

The host then moves to `checkpoint`, then `victory`, then `worldComplete`.

**Timing rules.** All gameplay timing is driven by `dt` inside `update()`, so pausing freezes it automatically. Speech never gates progress forever: lines resolve when they finish, are interrupted, or hit a fallback timeout. A line cut off by pausing is spoken again on resume.

**Safari Emotion Expedition rounds.**

```
intro (Leo introduces the animal + feeling)
  → demo (Leo demonstrates; the animal shows the pose)
  → dance (6–9 s beat; the MotionMeter fills with movement)
  → FREEZE (the beat cuts out; hold the pose within 14 s)
  → reveal (discovery card, sound, feeling and fact)
```

If tracking is lost for 1 s during dance or freeze, the round pauses, shows a repositioning hint, and resumes 0.8 s after the child is back in frame.

**Adaptive rules (deterministic, stored per world as `level`).**

| Rule | Effect |
|---|---|
| Level 1 / 2 / 3 | Pose hold time 2 s / 2.5 s / 3 s |
| A freeze is missed | Leo demonstrates again with a tip. The retry dance is shorter and the hold is 0.5 s shorter per miss (minimum 1.2 s) |
| 2 misses on one animal | A **Skip** button appears |
| 3 misses | The game moves on kindly and still teaches the fact |
| Session had no misses | Level goes up by 1 next time (maximum 3) |
| Session had 2 or more misses | Level goes down by 1 next time (minimum 1) |
| Quiz question | Asks about the animal with the most misses this session (ties go to the latest), to reinforce it |

The summary screen tells grown-ups in plain words what will change next time.

**Rewards.** `claimWorldReward()` grants 20 coins (`REWARD_POLICY`) the first time only. It always records completion and the best star count:
- **3 stars:** all poses held and the quiz right first time.
- **2 stars:** at least two-thirds of the poses held.
- **1 star:** the world was finished.

Discovery cards are stored as ids such as `safari:giraffe`. Metrics such as attempts, successes, hints, questions and time accumulate per world for the Milestone 5 parent report.
