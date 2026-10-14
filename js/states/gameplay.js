// Active gameplay host. Loads the world module, drives it from the single scheduler loop,
// forwards pause/resume, and hands the result to the learning checkpoint.
import { mountScreen, focusScreen } from '../ui/screen.js';
import { icon } from '../ui/icons.js';
import { audio } from '../core/audio.js';
import { addTask } from '../core/scheduler.js';
import { pose } from '../core/pose/PoseService.js';
import { STATES } from '../core/stateMachine.js';
import { getWorld } from '../data/worlds.js';
import { loadWorld, hasWorldModule } from '../worlds/index.js';

export function gameplayState(app) {
  let world = null;

  return {
    pausable: true,
    onPause() { world?.pause(); },
    onResume() { world?.resume(); },

    async enter({ go, signal, params }) {
      const config = getWorld(params.worldId);
      if (!config || !config.playable || !hasWorldModule(config.id)) { go(STATES.WORLD_INTRO, { worldId: params.worldId }); return; }
      if (!pose.isActive) { go(STATES.CAMERA_PERMISSION, { worldId: config.id }); return; }

      const el = mountScreen(`screen-game world-${config.id}`, `
        <header class="top-bar game-top">
          <button class="btn btn-soft" data-action="back">${icon('back')} Map</button>
          <h1 class="game-title">${config.name}</h1>
          <div class="top-bar-right">
            <button class="icon-btn" data-action="pause" aria-label="Pause">${icon('pause')}</button>
            <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
          </div>
        </header>
        <div class="game-root" data-root>
          <div class="game-loading"><div class="camera-spinner" style="--accent:${config.accent}"></div></div>
        </div>`);
      focusScreen(el);

      el.addEventListener('click', (e) => {
        const action = e.target.closest('.top-bar [data-action]')?.dataset.action;
        if (!action) return;
        audio.sfx('tap');
        if (action === 'back') go(STATES.HUB);
        if (action === 'pause') app.pause();
        if (action === 'settings') app.openSettings();
      }, { signal });

      let module;
      try {
        module = await loadWorld(config.id);
      } catch (err) {
        console.error('[gameplay] failed to load world', err);
        if (!signal.aborted) go(STATES.WORLD_INTRO, { worldId: config.id });
        return;
      }
      if (signal.aborted) return;

      world = module.createWorld({
        root: el.querySelector('[data-root]'),
        config,
        onComplete: (result) => { if (!signal.aborted) go(STATES.CHECKPOINT, { worldId: config.id, result }); },
      });
      await world.initialize();
      if (signal.aborted) { world.destroy(); world = null; return; }
      world.start();

      const remove = addTask('world', (dt) => {
        world.update(dt, pose.latest);
        world.render();
      });
      signal.addEventListener('abort', remove, { once: true });
    },

    exit() {
      world?.destroy();
      world = null;
      audio.stopBeat();
      audio.stopSpeech();
    },
  };
}
