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
  characters/
    clips.js               shared rig pose channels + 12 animation clips
    CharacterController.js playAnimation(), say(), blink, blending, destroy()
    bloop.js               Bloop's layered SVG + joint pivots
  data/worlds.js           world configuration
  states/                  loading, welcome, hub, worldIntro (M1)
  ui/                      screen mounting, scenery art, icons, parallax
assets/                    icons/, characters/, audio/, models/ (see assets/README.md)
docs/ARCHITECTURE.md       this file
```

Planned additions: `js/core/pose/` (M2), `js/worlds/<id>.js` (M3–M4), `js/states/{camera,calibration,tutorial,gameplay,checkpoint,victory,worldComplete,treasure,parentSummary}.js`.

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
| cameraPermission, calibration | M2 | Camera is only requested after the user taps |
| tutorial, gameplay, checkpoint, victory, worldComplete | M3–M4 | |
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
