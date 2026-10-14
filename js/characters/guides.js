// Which character guides each world. Worlds without their own character yet use Bloop.
import { BLOOP } from './bloop.js';
import { LEO } from './leo.js';
import { SPROCKET } from './sprocket.js';
import { WREN, CORAL, PEPPER } from './humanoid.js';

const GUIDES = { safari: LEO, farm: SPROCKET, castle: WREN, sea: CORAL, kitchen: PEPPER };

export const guideFor = (worldId) => GUIDES[worldId] ?? BLOOP;
