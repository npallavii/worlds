# Active Play Worlds

A browser-based educational adventure for children aged 5–10. Children move their bodies to control the game while animated characters teach them.

**Current build: Milestone 1.** It includes the adventure hub, the visual design system, Bloop the robot with full animations, the five world introductions, settings, pause, and spoken instructions with captions. The worlds can't be played yet: their **Start** buttons are disabled and labelled as coming next. Camera tracking arrives in Milestone 2.

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

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Choose a world | Tap a world card | `Tab` to the card, then `Enter` |
| Back to the map | **Map** button | `Tab` to the button, then `Enter` |
| Pause / resume (world screens) | Pause button | `P`, or `Esc` to resume |
| Settings | Gear button | `Tab` to the button, then `Enter` (`Esc` closes) |
| Make Bloop react (hub) | Tap Bloop | `Tab` to Bloop, then `Enter` |

The menus only use normal clicks, taps and keys. Nothing is activated by hovering.

## Settings (saved in this browser)

Volume, mute, spoken instructions, captions, background music (off by default) and reduced motion. Reduced motion follows the operating system's preference the first time the app runs.

## Privacy

The camera (from Milestone 2) is only requested after a grown-up taps to set it up. Video is processed on the device and is never recorded or uploaded. Progress and settings are stored only in this browser's `localStorage`, under keys that start with `apw:`.

## Deploy (static hosting)

There is no build step. Upload the project folder as it is.

- **Netlify:** drag the folder onto <https://app.netlify.com/drop>, or connect the repo with an empty build command and publish directory `.`.
- **GitHub Pages:** push the folder to a repo, then go to Settings → Pages → Deploy from branch → `/ (root)`.
- **Vercel / Cloudflare Pages:** framework preset "Other", no build command, output directory `.`.

Camera access needs **HTTPS**. All of these hosts provide it, and `localhost` is also allowed.

## Milestone 1 testing checklist

Run these at <http://localhost:8080/?debug>. Every item has been checked in headless Chrome at 1366×768, 1280×680, 1024×768 and 768×1024.

- [x] The loading screen shows real font-loading progress and moves on to the welcome screen.
- [x] On the welcome screen, the title letters animate in and Bloop waves. **Let's play!** unlocks audio and goes to the hub.
- [x] On arriving at the hub, Bloop waves and then speaks a greeting, with a caption at the bottom.
- [x] Hovering or focusing a world card makes Bloop point (throttled). Tapping Bloop triggers a random happy, wave or celebrate reaction.
- [x] All five cards open the correct world introduction.
- [x] On a world intro, Bloop walks in, points at the card and narrates. **Show me the move** demonstrates the move and then cheers. The speaker button replays the narration.
- [x] **Start** is disabled and explains that the game is coming next. There are no dead buttons and no fake success messages.
- [x] `P` or the pause button freezes animations and speech. **Keep playing**, `Esc`, **Settings** and **Back to the map** all work.
- [x] After 5 hub → intro → hub round trips, the HUD still shows 1 rAF loop, 2 tasks, 1 live character and 1 mounted screen, with no console errors.
- [x] The settings dialog opens, every control saves and the settings survive a reload.
- [x] At tablet portrait size (768×1024) the cards reflow to two columns and the page scrolls.
- [ ] Manual: listen to the speech voice and sound effects on real speakers (headless tests can't hear them).
- [ ] Manual: check the touch feel on a real tablet.

## Roadmap

| Milestone | Scope |
|---|---|
| **1 ✔** | Hub, design system, animated Bloop, world intros, settings, pause, captions |
| 2 | Pose service (MediaPipe Tasks Vision Pose Landmarker; the version will be pinned and verified then), camera permission and error states, calibration, out-of-frame guidance, simulation mode |
| 3 | Safari Emotion Expedition, fully playable, with Leo, the pose-hold detector, facts and a question |
| 4 | Farm, Castle, Sea and Kitchen built on the shared world interface |
| 5 | Learning metrics, adaptive rules, rewards, treasure chest, parent summary, session timer |
| 6 | Full acceptance test pass and deployment hardening |
