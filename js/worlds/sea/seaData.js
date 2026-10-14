// Deep Sea Discovery content: creatures with simple, accurate facts, and their art.
export const CREATURES = [
  {
    id: 'clownfish', name: 'Clownfish',
    fact: "Clownfish live among sea anemones. The anemone's stinging tentacles help keep them safe.",
    question: { prompt: 'Which sea animal hides among sea anemones to stay safe?', hint: 'It is orange with white stripes!' },
  },
  {
    id: 'turtle', name: 'Sea turtle',
    fact: 'Sea turtles breathe air, so they swim up to the surface to take a breath.',
    question: { prompt: 'Which sea animal swims up to the surface to breathe air?', hint: 'It has a shell on its back!' },
  },
  {
    id: 'octopus', name: 'Octopus',
    fact: 'An octopus has eight arms, and it can change colour to hide.',
    question: { prompt: 'Which sea animal has eight arms?', hint: 'Count the wiggly arms!' },
  },
  {
    id: 'seahorse', name: 'Seahorse',
    fact: "With seahorses, it's the dad who carries the eggs until the babies are born.",
    question: { prompt: 'In which animal does the dad carry the eggs?', hint: 'Its head looks a little like a horse!' },
  },
];

export const getCreature = (id) => CREATURES.find((c) => c.id === id);

const ART = {
  clownfish: `<ellipse cx="60" cy="60" rx="38" ry="24" fill="#ff8a3d"/><path d="M96 60 L114 42 L114 78 Z" fill="#ff8a3d"/>
    <path d="M42 38 q6 22 0 44 M66 37 q6 23 0 46" stroke="#fff" stroke-width="8" fill="none"/>
    <path d="M42 38 q6 22 0 44 M66 37 q6 23 0 46" stroke="#2b2a4c" stroke-width="2" fill="none" opacity="0.35"/>
    <circle cx="32" cy="54" r="5" fill="#2b2a4c"/><circle cx="33.5" cy="52.5" r="1.6" fill="#fff"/><path d="M24 66 q5 4 10 0" stroke="#2b2a4c" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  turtle: `<ellipse cx="34" cy="38" rx="12" ry="7" fill="#7fc98a" transform="rotate(-30 34 38)"/><ellipse cx="34" cy="84" rx="12" ry="7" fill="#7fc98a" transform="rotate(30 34 84)"/>
    <ellipse cx="86" cy="40" rx="12" ry="7" fill="#7fc98a" transform="rotate(30 86 40)"/><ellipse cx="86" cy="82" rx="12" ry="7" fill="#7fc98a" transform="rotate(-30 86 82)"/>
    <circle cx="104" cy="60" r="12" fill="#7fc98a"/><circle cx="108" cy="56" r="2.8" fill="#2b2a4c"/>
    <ellipse cx="60" cy="60" rx="34" ry="28" fill="#4f9a5a"/>
    <path d="M60 34 L74 48 L70 68 L50 68 L46 48 Z M46 48 L28 54 M74 48 L92 54 M50 68 L40 82 M70 68 L80 82 M60 34 V32" stroke="#a8e0a0" stroke-width="3" fill="none" stroke-linejoin="round"/>`,
  octopus: `<g stroke="#c97ad9" stroke-width="9" fill="none" stroke-linecap="round">
      <path d="M38 70 q-14 18 -6 34"/><path d="M48 74 q-6 20 -12 30"/><path d="M58 76 q0 18 -4 30"/><path d="M66 76 q4 18 6 30"/>
      <path d="M74 74 q10 16 14 28"/><path d="M82 70 q14 14 16 28"/><path d="M34 64 q-18 8 -20 20"/><path d="M86 64 q18 8 20 20"/></g>
    <ellipse cx="60" cy="48" rx="30" ry="32" fill="#d98ae6"/>
    <circle cx="49" cy="52" r="5" fill="#2b2a4c"/><circle cx="71" cy="52" r="5" fill="#2b2a4c"/><path d="M54 64 q6 5 12 0" stroke="#2b2a4c" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  seahorse: `<path d="M58 18 C 82 16, 86 40, 70 48 C 60 54, 62 64, 70 72 C 80 84, 74 104, 56 104 C 46 104, 44 94, 52 92 C 60 90, 60 84, 54 78 C 44 68, 42 52, 50 40 C 44 36, 46 22, 58 18 Z" fill="#ffc857"/>
    <path d="M78 26 L98 22 L96 30 L78 32 Z" fill="#ffc857"/><circle cx="68" cy="28" r="4.5" fill="#2b2a4c"/>
    <path d="M44 46 q-10 6 -6 14 q8 -2 10 -10" fill="#ffb02e"/>
    <path d="M58 18 l-4 -8 M64 18 l0 -9 M70 20 l4 -8" stroke="#ffb02e" stroke-width="3" stroke-linecap="round"/>`,
};

export const creatureArt = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true">${ART[id] ?? ''}</svg>`;
