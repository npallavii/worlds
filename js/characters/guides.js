// Which character guides each world. Worlds without their own character yet use Bloop.
import { BLOOP } from './bloop.js';
import { LEO } from './leo.js';

const GUIDES = { safari: LEO };

export const guideFor = (worldId) => GUIDES[worldId] ?? BLOOP;
