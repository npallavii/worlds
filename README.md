# Active Play Worlds

A browser-based educational adventure for children aged 5–10. Children move their bodies to control the game while animated characters teach them.

**Current build: Milestone 4.** It includes the adventure hub, Bloop the robot, body tracking (camera setup, calibration, practice, and a mouse/keyboard simulation), and **all five worlds, fully playable**. Each world has its own guide character, a learning quiz, rewards and a summary:

| World | Guide | How you move | What you learn |
|---|---|---|---|
| Safari Emotion Expedition | Leo the lion explorer | Dance, then freeze in an animal pose | Animals, feelings, balance |
| Phonics Farm | Farmer Sprocket (robot) | Reach out to pop letter pots | Letter sounds, spelling CAT, DOG, FROG… |
| Magician's Shape Castle | Wren the wizard | Make triangle, square and star shapes with your body | Shapes, sides and corners, real-world examples |
| Deep Sea Discovery | Captain Coral | Lean to steer, row your arms to speed up | Sea creatures, left and right, ocean care |
| Healthy Kitchen Quest | Chef Pepper | Move side to side to catch food in a basket | Food groups, counting, balanced meals |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architecture, state design and visual spec.

## Run locally

The app uses ES modules, so it **must be served over `http://localhost`**. Opening `index.html` directly (`file://`) won't work, because browsers block module imports from `file://`.

Pick one:

```bash
# Python 3 (built in on most machines)
python -m http.server 8080

# Node.js
npm start            # runs http-server@14.1.1 on port 8080, caching disabled
```

Then open <http://localhost:8080>.

Use a current version of Chrome, Edge, Firefox or Safari. An internet connection is needed for Google Fonts and the Tailwind CDN. Without one, the layout and art still work and only the fonts fall back.

### Debug mode

Open <http://localhost:8080/?debug> to show:

- **A HUD** (bottom right) with the current state, whether the single rAF loop is running, each registered frame task, the number of live characters and the number of mounted screens. Use it to confirm that switching screens doesn't leak loops or listeners.
- **An animation panel** (bottom left) that plays any of Bloop's 12 clips, plus `say()`.
- **Pose status** in the HUD: the source (camera, simulation or off), the inference rate in Hz, the tracking confidence, and any framing issue (for example `noPerson` or `tooClose`).

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Choose a world | Tap a world card | `Tab` to the card, then `Enter` |
| Back to the map | **Map** button | `Tab` to the button, then `Enter` |
| Pause / resume (world screens) | Pause button | `P`, or `Esc` to resume |
| Settings | Gear button | `Tab` to the button, then `Enter` (`Esc` closes) |
| Make Bloop react (hub) | Tap Bloop | `Tab` to Bloop, then `Enter` |

The menus only use normal clicks, taps and keys. Nothing is activated by hovering.

### Simulation mode (no webcam)

On the camera screen, choose **Play without camera**. The same option appears if the camera fails. A practice figure then stands in for the child:

| Input | Effect |
|---|---|
| Move the mouse | Move side to side |
| Hold the mouse button | Right hand follows the pointer (reaching) |
| `1` / `2` / `3` / `4` | Arms down / arms up / arms wide / lift one knee |
| `5` / `6` / `7` | Triangle / square / star body shapes (Shape Castle) |
| `←` / `→` (hold) | Lean left / right |
| `Space` (hold) | Row your arms |

The simulation produces exactly the same landmark data as the camera, so everything built on tracking can be tested without a webcam.

## Settings (saved in this browser)

Volume, mute, spoken instructions, captions, background music (off by default), reduced motion, and the body outline drawn over the camera picture. Reduced motion follows the operating system's preference the first time the app runs.

## Privacy

The camera is only requested after someone taps **Turn on camera**, following a screen that explains why it's needed. Video frames go only into the body-tracking model running in the browser. Nothing is recorded, saved or uploaded. The camera is switched off (the browser's camera light goes out) as soon as the child leaves the camera screens, returns to the map, or closes the page.

The body-tracking code and model are downloaded from public CDNs (jsDelivr and Google's model storage). Only those files are downloaded; no video or data is sent back. Progress and settings are stored only in this browser's `localStorage`, under keys that start with `apw:`.

## Deploy (static hosting)

There is no build step. Upload the project folder as it is.

- **Netlify:** drag the folder onto <https://app.netlify.com/drop>, or connect the repo with an empty build command and publish directory `.`.
- **GitHub Pages:** push the folder to a repo, then go to Settings → Pages → Deploy from branch → `/ (root)`.
- **Vercel / Cloudflare Pages:** framework preset "Other", no build command, output directory `.`.

Camera access needs **HTTPS**. All of these hosts provide it, and `localhost` is also allowed.

## Testing checklist

Run these at <http://localhost:8080/?debug>. Items marked [x] were checked with automated headless Chrome runs.

### Milestone 1

- [x] The loading screen shows real font-loading progress and moves on to the welcome screen.
- [x] On the welcome screen, the title letters animate in and Bloop waves. **Let's play!** unlocks audio and goes to the hub.
- [x] On arriving at the hub, Bloop waves and then speaks a greeting, with a caption at the bottom.
- [x] Hovering or focusing a world card makes Bloop point (throttled). Tapping Bloop triggers a random happy, wave or celebrate reaction.
- [x] All five cards open the correct world introduction.
- [x] On a world intro, Bloop walks in, points at the card and narrates. **Show me the move** demonstrates the move and then cheers. The speaker button replays the narration.
- [x] The world intro explains that the full game is coming next. Its button opens the practice flow, so there are no dead buttons and no fake success messages.
- [x] `P` or the pause button freezes animations and speech. **Keep playing**, `Esc`, **Settings** and **Back to the map** all work.
- [x] After 5 hub → intro → hub round trips, the HUD still shows 1 rAF loop, 2 tasks, 1 live character and 1 mounted screen, with no console errors.
- [x] The settings dialog opens, every control saves and the settings survive a reload.
- [x] At tablet portrait size (768×1024) the cards reflow to two columns and the page scrolls.
- [ ] Manual: listen to the speech voice and sound effects on real speakers (headless tests can't hear them).
- [ ] Manual: check the touch feel on a real tablet.

### Milestone 4: the other four worlds
Each world was played through in simulation by an automated test that reached, made shapes, steered and moved like a child. The checkpoint, victory and summary were checked for each.
- [x] **Phonics Farm:** pots float with letters. Touching a wrong pot wobbles it and names its letter. Touching the right pot breaks it and flies the letter into its slot. Words complete with the animal and a fact.
- [x] **Shape Castle:** the magic wall approaches with a shape cut-out. Holding the matching body shape fills it with light, dissolves the wall, opens a portal and teaches the shape.
- [x] **Deep Sea:** steering follows lean or body shift. Rowing strokes add speed. Starfish, creature discoveries (with facts), gentle bumps and Coral Cove at the finish all work.
- [x] **Healthy Kitchen:** the basket follows the body. Recipe items tick off with their food group. Other foods are explained kindly and never called bad. A finished recipe becomes a meal.
- [x] Each world awards its coins and badge once, saves its discoveries and metrics, and turns the camera off afterwards.
- [ ] Manual, real webcam: reach accuracy for the farm pots at different distances from the camera.
- [ ] Manual, real webcam: the square ("window arms") pose with children of different heights.
- [ ] Manual, real webcam: how steering feels when leaning versus stepping sideways.

### Milestone 3: Safari Emotion Expedition
- [x] The full game plays through in simulation: three animals, each going intro → Leo demonstrates → dance → FREEZE → hold → discovery card.
- [x] The dance meter responds to movement and shows "Great dancing!". The music stops exactly when FREEZE appears.
- [x] A missed freeze (14 s with no pose) gives "Good try!": Leo encourages, demonstrates again, and the retry has a shorter hold time. Nothing is taken away.
- [x] The quiz asks about the animal the child found hardest. A wrong answer gives a clue; the right answer is explained.
- [x] Victory awards 20 coins, a badge and stars. Claiming again grants 0 coins, so replays and reloads never re-award.
- [x] The summary shows what was learned, how it went, quiz result, time played and the treasure-chest progress. It also includes a note for grown-ups about the next difficulty level.
- [x] The camera switches off after gameplay. Coins on the hub update.
- [ ] Manual, real webcam: play all three animals and check that each pose is recognised for children of different heights.
- [ ] Manual: listen to the dance beat and the animal sounds on real speakers.

### Milestone 2: tracking
- [x] **Practise the moves** opens the camera explanation screen. The camera is not requested until **Turn on camera** is tapped.
- [x] With a camera (Chrome's fake test camera), MediaPipe loads, tracking runs at about 20 Hz, and the screen says "I can't see you yet" when no person is visible.
- [x] **Back** from calibration switches the camera off: the video track is released and the HUD shows `pose: off`.
- [x] When permission is denied, the screen explains how a grown-up can allow it, with **Try again** and **Play without camera** buttons. **Play without camera** works.
- [x] Simulation: calibration completes (in frame → stand still → arms up) and records the neutral position.
- [x] Simulation: all three practice moves (arms up, arms wide, lift knee) are detected, held for 2 seconds and awarded a star, then the completion screen appears.
- [x] Pausing during practice also pauses tracking. Resuming continues.
- [x] After the full flow and a return to the map: one rAF loop, one character, tracking off, and no console errors.
- [ ] Manual, real webcam: calibration with a real child or adult at 1.5–2.5 m, in normal room lighting.
- [ ] Manual, real webcam: step out of frame mid-practice. The challenge should pause with a hint and resume when you return.
- [ ] Manual, real webcam: stand too close, then too far. The "take two big steps back" and "come a little closer" hints should appear.

## Roadmap

| Milestone | Scope |
|---|---|
| **1 ✔** | Hub, design system, animated Bloop, world intros, settings, pause, captions |
| **2 ✔** | Pose service (MediaPipe Tasks Vision `0.10.35`, Pose Landmarker Lite), camera permission and error states, calibration, out-of-frame guidance, practice session, simulation mode |
| **3 ✔** | Safari Emotion Expedition, fully playable, with Leo, the dance/freeze pose holds, discovery cards, a quiz, rewards and a summary |
| **4 ✔** | Farm, Castle, Sea and Kitchen, with four new guide characters, built on a shared world toolkit |
| 5 | Learning metrics, adaptive rules, rewards, treasure chest, parent summary, session timer |
| 6 | Full acceptance test pass and deployment hardening |
