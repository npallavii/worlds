// Simple, friendly stick-figure pictograms that show which pose to make.
const FIGURES = {
  armsUp: '<path d="M50 40 L50 72 M50 72 L40 96 M50 72 L60 96 M50 46 L36 18 M50 46 L64 18"/>',
  armsWide: '<path d="M50 40 L50 72 M50 72 L40 96 M50 72 L60 96 M50 48 L18 46 M50 48 L82 46"/>',
  balance: '<path d="M50 40 L50 72 M50 72 L44 96 M50 72 L64 80 L56 92 M50 48 L26 56 M50 48 L74 56"/>',
};

export function posePictogram(pose, cls = '') {
  return `<svg class="pictogram ${cls}" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="28" r="9"/>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">${FIGURES[pose] ?? ''}</g>
  </svg>`;
}
