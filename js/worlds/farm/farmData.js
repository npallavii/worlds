// Phonics Farm content: decodable words by level, letter sounds, animal art and facts.
// Level 1 uses three-letter CVC words; level 2+ uses four-letter words with a blend or "ck".

export const WORDS_BY_LEVEL = [
  ['CAT', 'DOG', 'PIG', 'HEN'],
  ['FROG', 'DUCK', 'CAT', 'PIG'],
  ['DUCK', 'FROG', 'HEN', 'DOG'],
];

// How each letter sounds, written so speech synthesis reads it naturally.
export const LETTER_SOUNDS = {
  A: 'a, as in apple', B: 'buh', C: 'kuh', D: 'duh', E: 'eh, as in egg', F: 'fff', G: 'guh',
  H: 'huh', I: 'ih, as in igloo', K: 'kuh', L: 'lll', M: 'mmm', N: 'nnn', O: 'o, as in octopus',
  P: 'puh', R: 'rrr', S: 'sss', T: 'tuh', U: 'uh, as in umbrella', W: 'wuh', Z: 'zzz',
};

// Letters used as distractors: visually distinct, all with simple single sounds.
export const DISTRACTORS = ['B', 'M', 'S', 'T', 'L', 'R', 'W', 'Z', 'N', 'F', 'D', 'P', 'G', 'H'];

export const ANIMALS = {
  CAT: { name: 'Cat', fact: 'Cats purr when they feel happy and relaxed.' },
  DOG: { name: 'Dog', fact: 'Dogs can smell much, much better than people can.' },
  PIG: { name: 'Pig', fact: 'Pigs roll in mud to keep cool on hot days.' },
  HEN: { name: 'Hen', fact: 'Hens make soft clucking sounds to talk to their chicks.' },
  FROG: { name: 'Frog', fact: 'Frogs start life as tadpoles that swim in the water.' },
  DUCK: { name: 'Duck', fact: 'Ducks have waterproof feathers, so water rolls right off them.' },
};

const ART = {
  CAT: `<circle cx="60" cy="64" r="34" fill="#f6a24b"/><path d="M30 48 L34 16 L54 36 Z M90 48 L86 16 L66 36 Z" fill="#f6a24b"/><path d="M36 42 L37 25 L49 37 Z M84 42 L83 25 L71 37 Z" fill="#ffd0b0"/>
    <path d="M46 52 q4 -4 8 0 M66 52 q4 -4 8 0" stroke="#e08a3a" stroke-width="3" fill="none"/>
    <ellipse cx="48" cy="62" rx="4" ry="6" fill="#2b2a4c"/><ellipse cx="72" cy="62" rx="4" ry="6" fill="#2b2a4c"/>
    <path d="M56 72 h8 l-4 5 z" fill="#ff8aa0"/><path d="M60 77 q-5 6 -10 2 M60 77 q5 6 10 2" stroke="#2b2a4c" stroke-width="2" fill="none"/>
    <path d="M30 72 h-14 M30 78 h-12 M90 72 h14 M90 78 h12" stroke="#2b2a4c" stroke-width="1.6"/>`,
  DOG: `<ellipse cx="28" cy="58" rx="12" ry="24" fill="#8a5a36" transform="rotate(16 28 58)"/><ellipse cx="92" cy="58" rx="12" ry="24" fill="#8a5a36" transform="rotate(-16 92 58)"/>
    <circle cx="60" cy="62" r="32" fill="#c98d5a"/><ellipse cx="74" cy="50" rx="10" ry="9" fill="#8a5a36"/>
    <ellipse cx="60" cy="78" rx="16" ry="12" fill="#f3d6b4"/><ellipse cx="60" cy="72" rx="7" ry="5" fill="#2b2a4c"/>
    <circle cx="48" cy="58" r="4.5" fill="#2b2a4c"/><circle cx="72" cy="58" r="4.5" fill="#2b2a4c"/>
    <path d="M60 77 v4 q-6 6 -10 1 M60 81 q6 6 10 1" stroke="#2b2a4c" stroke-width="2" fill="none"/><ellipse cx="60" cy="90" rx="5" ry="4" fill="#ff8aa0"/>`,
  PIG: `<path d="M32 40 L28 20 L48 32 Z M88 40 L92 20 L72 32 Z" fill="#f5a3b5"/><circle cx="60" cy="62" r="34" fill="#ffb8c8"/>
    <ellipse cx="60" cy="72" rx="16" ry="12" fill="#f58ba3"/><ellipse cx="54" cy="72" rx="3" ry="4.5" fill="#c4566e"/><ellipse cx="66" cy="72" rx="3" ry="4.5" fill="#c4566e"/>
    <circle cx="46" cy="54" r="4.5" fill="#2b2a4c"/><circle cx="74" cy="54" r="4.5" fill="#2b2a4c"/>
    <path d="M52 88 q8 5 16 0" stroke="#c4566e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  HEN: `<path d="M48 22 q4 -10 10 -2 q4 -10 10 0 q6 -6 8 4 l-6 8 h-20 z" fill="#e8584a"/>
    <ellipse cx="60" cy="66" rx="32" ry="36" fill="#fffaf0" stroke="#efe4d0" stroke-width="2"/>
    <path d="M58 60 l20 4 -20 6 z" fill="#ffb02e"/><path d="M62 70 q2 10 -4 14 q-4 -6 4 -14" fill="#e8584a"/>
    <circle cx="52" cy="54" r="4.5" fill="#2b2a4c"/><path d="M30 72 q-8 8 0 16 q8 -4 6 -12" fill="#f0e6d2"/>`,
  FROG: `<circle cx="40" cy="38" r="14" fill="#6cc04a"/><circle cx="80" cy="38" r="14" fill="#6cc04a"/>
    <circle cx="40" cy="36" r="8" fill="#fff"/><circle cx="80" cy="36" r="8" fill="#fff"/><circle cx="41" cy="37" r="4.5" fill="#2b2a4c"/><circle cx="79" cy="37" r="4.5" fill="#2b2a4c"/>
    <ellipse cx="60" cy="70" rx="40" ry="30" fill="#7fd05a"/><path d="M36 76 q24 18 48 0" stroke="#3e8a2a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="38" cy="66" rx="6" ry="3.5" fill="#ff9db0" opacity="0.6"/><ellipse cx="82" cy="66" rx="6" ry="3.5" fill="#ff9db0" opacity="0.6"/>`,
  DUCK: `<circle cx="60" cy="56" r="32" fill="#ffd84a"/><path d="M76 60 q22 -4 26 6 q-10 10 -26 4 z" fill="#ff9a2e"/>
    <circle cx="66" cy="48" r="5" fill="#2b2a4c"/><circle cx="67.5" cy="46.5" r="1.6" fill="#fff"/>
    <path d="M50 22 q6 -10 12 0" stroke="#ffd84a" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="48" cy="64" rx="6" ry="3.5" fill="#ffad5e" opacity="0.7"/>`,
};

export const animalArt = (word) => `<svg viewBox="0 0 120 110" aria-hidden="true">${ART[word] ?? ''}</svg>`;

export const letterArt = (letter, color = '#d4554a') => `
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="#fffaf0" stroke="${color}" stroke-width="6"/>
    <text x="50" y="68" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="56" fill="${color}">${letter}</text>
  </svg>`;
