// Shape Castle content: each shape, the safe body pose that makes it, and what to teach.
export const SHAPES = [
  {
    id: 'triangle', short: '3 sides, 3 corners', name: 'Triangle', pose: 'triangle', color: '#ffc857',
    cue: 'Make a triangle! Put your hands together over your head, like a pointy rooftop.',
    teach: 'A triangle has 3 sides and 3 corners.',
    example: 'You can find triangles in a slice of pizza, a rooftop, or a tent.',
    tip: 'Reach both hands up and touch your fingertips together above your head.',
    question: { prompt: 'Which shape has 3 sides and 3 corners?', hint: 'It looks like a slice of pizza!' },
  },
  {
    id: 'square', short: '4 equal sides', name: 'Square', pose: 'square', color: '#7fd8be',
    cue: 'Make a square! Elbows out to the sides, hands up high, like a window frame.',
    teach: 'A square has 4 sides that are all the same length, and 4 corners.',
    example: 'You can find squares on a cracker, a sticky note, or a chessboard.',
    tip: 'Lift your elbows out to the sides, then point your hands up to the sky.',
    question: { prompt: 'Which shape has 4 sides that are all the same length?', hint: 'It looks like a cracker!' },
  },
  {
    id: 'star', short: '5 points', name: 'Star', pose: 'star', color: '#ff9fbb',
    cue: 'Make a star! Stretch your arms up and out, as big as you can.',
    teach: 'The star shape we draw has 5 points.',
    example: 'Real stars in the sky are giant balls of glowing gas. We draw them with points so they look like they twinkle!',
    tip: 'Reach your arms up and out wide, like a big letter V.',
    question: { prompt: 'Which shape has 5 points?', hint: 'It twinkles in drawings of the night sky!' },
  },
];

export const getShape = (id) => SHAPES.find((s) => s.id === id);

const PATHS = {
  triangle: 'M60 14 L106 98 H14 Z',
  square: 'M20 20 H100 V100 H20 Z',
  star: 'M60 10 L72 44 L108 46 L80 68 L90 104 L60 84 L30 104 L40 68 L12 46 L48 44 Z',
};

/** Shape as a polygon in a 120×120 box (also used to draw the wall's cut-out). */
export const shapePath = (id) => PATHS[id];

export const shapeArt = (id, color = getShape(id)?.color ?? '#ffc857') => `
  <svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="${PATHS[id]}" fill="${color}" stroke="#5b3fa8" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="50" cy="${id === 'triangle' ? 72 : 58}" r="4" fill="#2b2a4c"/><circle cx="70" cy="${id === 'triangle' ? 72 : 58}" r="4" fill="#2b2a4c"/>
    <path d="M52 ${id === 'triangle' ? 82 : 68} q8 6 16 0" stroke="#2b2a4c" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
