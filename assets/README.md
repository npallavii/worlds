# Assets

| Folder | Contents | Status |
|---|---|---|
| `icons/` | Favicon and static icons | `favicon.svg` (original) |
| `characters/` | Exported character art / sprite sheets, if any are added later | Empty. Characters are original layered SVG built in `js/characters/` so each body part can animate |
| `audio/` | Licensed audio clips, if any are added later | Empty. All sound effects and music are synthesized at runtime with the Web Audio API (`js/core/audio.js`), so there are no licensing concerns |
| `models/` | Optional self-hosted pose model | Empty. The Pose Landmarker Lite model is loaded from Google's official model storage (see `js/core/pose/PoseService.js`). Check Google's MediaPipe Pose Landmarker model card for its license terms before production use |

All artwork in this prototype is original and drawn in code (`js/ui/scenery.js`, `js/characters/bloop.js`). If you add third-party assets, record each one's source and license in this file.
