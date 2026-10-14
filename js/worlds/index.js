// World module registry. Modules load on demand so only the world being played is fetched.
// Each module exports createWorld({ root, config, onComplete }) returning an object with
// initialize() · start() · update(dt, frame) · render() · pause() · resume() · destroy().
const MODULES = {
  safari: () => import('./safari/SafariWorld.js'),
  farm: () => import('./farm/FarmWorld.js'),
  castle: () => import('./castle/CastleWorld.js'),
  sea: () => import('./sea/SeaWorld.js'),
  kitchen: () => import('./kitchen/KitchenWorld.js'),
};

export const hasWorldModule = (id) => id in MODULES;

export async function loadWorld(id) {
  const load = MODULES[id];
  if (!load) throw new Error(`No playable module for world "${id}"`);
  return load();
}
