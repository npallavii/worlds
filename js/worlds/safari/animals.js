// Safari animals: art, the pose each one teaches, an emotion word, and a checked fact.
// Facts are kept simple and accurate for 5–10 year olds.

export const ANIMALS = [
  {
    id: 'giraffe',
    name: 'Giraffe',
    character: 'Gina',
    emotion: 'proud',
    pose: 'armsUp',
    intro: "This is Gina the giraffe! When Gina feels proud, she stands up really tall.",
    cue: 'Freeze like a proud giraffe! Reach your arms up high!',
    feeling: 'Proud is the good feeling you get when you try hard at something.',
    fact: 'Giraffes are the tallest animals in the world. Their tongue is about as long as your arm!',
    tip: 'Push your hands up toward the sky, as high as you can.',
    question: { prompt: 'Which animal is the tallest in the world?', hint: 'It has a very, very long neck!' },
  },
  {
    id: 'elephant',
    name: 'Elephant',
    character: 'Ellie',
    emotion: 'happy',
    pose: 'armsWide',
    intro: "Here comes Ellie the elephant! When Ellie feels happy, she flaps her big ears.",
    cue: 'Freeze like a happy elephant! Stretch your arms out wide like big ears!',
    feeling: 'Happy is a warm, smiley feeling inside you.',
    fact: 'Elephants flap their huge ears to help them cool down on hot days.',
    tip: 'Stretch your arms out to the sides, nice and long, like a letter T.',
    question: { prompt: 'Which animal flaps its big ears to cool down?', hint: 'It has a long trunk!' },
  },
  {
    id: 'flamingo',
    name: 'Flamingo',
    character: 'Flo',
    emotion: 'calm',
    pose: 'balance',
    intro: "Meet Flo the flamingo! When Flo feels calm, she rests standing on one leg.",
    cue: 'Freeze like a calm flamingo! Lift one knee a little bit.',
    feeling: 'Calm means feeling quiet and peaceful inside, like taking slow breaths.',
    fact: 'Flamingos often rest on one leg. Their pink colour comes from the food they eat!',
    tip: 'Lift one knee just a little. You can hold on to a chair to help you balance.',
    question: { prompt: 'Which animal likes to rest standing on one leg?', hint: "It's a pink bird!" },
  },
];

export const getAnimal = (id) => ANIMALS.find((a) => a.id === id);

/* ------------------------------------------------------------------ */
/* Art — each has .anim-* groups that css/safari.css animates           */
/* ------------------------------------------------------------------ */

const ART = {
  giraffe: () => `
    <svg class="animal-art animal-giraffe" viewBox="0 0 220 260" aria-hidden="true">
      <ellipse cx="120" cy="252" rx="62" ry="7" fill="#7a4a1a" opacity="0.18"/>
      <g class="anim-body">
        <path d="M170 168 q22 6 24 34" stroke="#d9a23e" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="194" cy="204" r="6" fill="#7a4f2e"/>
        <g fill="#e9b247">
          <rect x="82" y="182" width="13" height="64" rx="6"/><rect x="104" y="184" width="13" height="62" rx="6"/>
          <rect x="140" y="184" width="13" height="62" rx="6"/><rect x="160" y="182" width="13" height="64" rx="6"/>
        </g>
        <g fill="#6b4425"><rect x="81" y="240" width="15" height="9" rx="3"/><rect x="103" y="240" width="15" height="9" rx="3"/><rect x="139" y="240" width="15" height="9" rx="3"/><rect x="159" y="240" width="15" height="9" rx="3"/></g>
        <ellipse cx="128" cy="170" rx="56" ry="32" fill="#f2c14e"/>
        <g fill="#c07a34">
          <path d="M96 156 l14 -6 10 8 -4 12 -14 2z"/><path d="M130 150 l14 0 6 12 -10 8 -12 -6z"/>
          <path d="M156 164 l12 4 0 12 -12 4 -8 -10z"/><path d="M108 178 l14 2 2 12 -14 4 -6 -10z"/>
          <path d="M138 182 l10 -2 6 10 -8 8 -10 -6z"/>
        </g>
      </g>
      <g class="anim-neck" style="transform-origin: 92px 160px">
        <path d="M78 168 L54 52 L80 46 L108 158 Z" fill="#f2c14e"/>
        <path d="M66 50 Q60 100 82 160" stroke="#c07a34" stroke-width="4" stroke-dasharray="4 8" fill="none" opacity="0.6"/>
        <g fill="#c07a34"><path d="M70 80 l10 -2 4 9 -8 5 -7 -5z"/><path d="M78 112 l10 -1 3 10 -9 4 -6 -6z"/><path d="M86 140 l9 0 3 9 -8 4 -6 -5z"/></g>
        <g class="anim-head">
          <path d="M50 24 v-14 M66 22 v-14" stroke="#c07a34" stroke-width="4" stroke-linecap="round"/>
          <circle cx="50" cy="9" r="5" fill="#7a4f2e"/><circle cx="66" cy="7" r="5" fill="#7a4f2e"/>
          <ellipse cx="38" cy="30" rx="10" ry="5" fill="#e9b247" transform="rotate(-25 38 30)"/>
          <ellipse cx="58" cy="40" rx="24" ry="19" fill="#f2c14e"/>
          <ellipse cx="40" cy="48" rx="15" ry="12" fill="#f7d58a"/>
          <circle cx="62" cy="34" r="4.5" fill="#3a2a1e"/><circle cx="63.5" cy="32.5" r="1.5" fill="#fff"/>
          <circle cx="34" cy="45" r="1.8" fill="#7a4f2e"/><circle cx="42" cy="44" r="1.8" fill="#7a4f2e"/>
          <path d="M34 54 q8 5 16 0" stroke="#7a4f2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="66" cy="46" rx="5" ry="3" fill="#ff9b8a" opacity="0.6"/>
        </g>
      </g>
    </svg>`,

  elephant: () => `
    <svg class="animal-art animal-elephant" viewBox="0 0 240 240" aria-hidden="true">
      <ellipse cx="128" cy="232" rx="78" ry="7" fill="#3a3a5a" opacity="0.16"/>
      <g class="anim-body">
        <path d="M202 120 q16 14 10 40" stroke="#9293ba" stroke-width="5" fill="none" stroke-linecap="round"/>
        <g fill="#9c9dc4">
          <rect x="94" y="160" width="26" height="68" rx="12"/><rect x="126" y="164" width="26" height="64" rx="12"/>
          <rect x="160" y="164" width="26" height="64" rx="12"/><rect x="184" y="160" width="22" height="68" rx="11"/>
        </g>
        <g fill="#e6e2f5"><rect x="96" y="222" width="22" height="7" rx="3"/><rect x="128" y="222" width="22" height="7" rx="3"/><rect x="162" y="222" width="22" height="7" rx="3"/><rect x="186" y="222" width="18" height="7" rx="3"/></g>
        <ellipse cx="150" cy="140" rx="66" ry="52" fill="#a9abd0"/>
        <path d="M110 110 q30 -16 70 -6" stroke="#fff" stroke-width="5" fill="none" opacity="0.3" stroke-linecap="round"/>
      </g>
      <g class="anim-head">
        <g class="anim-ear" style="transform-origin: 92px 100px">
          <path d="M96 64 C 140 60, 150 130, 112 146 C 92 154, 74 130, 78 100 Z" fill="#9c9dc4"/>
          <path d="M98 76 C 128 76, 134 124, 110 134 C 98 138, 88 124, 90 104 Z" fill="#f4b9c8" opacity="0.8"/>
        </g>
        <circle cx="70" cy="104" r="42" fill="#a9abd0"/>
        <g class="anim-trunk" style="transform-origin: 46px 120px">
          <path d="M46 112 C 26 130, 28 170, 40 190 C 44 198, 56 196, 54 186 C 46 170, 48 146, 62 130 Z" fill="#a9abd0"/>
          <path d="M40 150 h10 M38 162 h10 M40 174 h10" stroke="#8d8fb8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <path d="M58 128 q-14 10 -22 4" stroke="#fffaf0" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="62" cy="94" r="5" fill="#2b2a4c"/><circle cx="63.5" cy="92.5" r="1.6" fill="#fff"/>
        <path d="M54 84 q8 -5 16 0" stroke="#6d6f9a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse cx="78" cy="112" rx="7" ry="4" fill="#ff9db0" opacity="0.6"/>
      </g>
    </svg>`,

  flamingo: () => `
    <svg class="animal-art animal-flamingo" viewBox="0 0 200 260" aria-hidden="true">
      <ellipse cx="104" cy="252" rx="40" ry="6" fill="#8a3a5a" opacity="0.16"/>
      <g class="anim-leg-a">
        <path d="M100 150 L98 200 L100 246" stroke="#ef7fa0" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M100 246 l-12 4 M100 246 l12 4" stroke="#ef7fa0" stroke-width="4" stroke-linecap="round"/>
      </g>
      <g class="anim-leg-b" style="transform-origin: 112px 150px">
        <path d="M112 150 L116 200 L114 246" stroke="#ef7fa0" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M114 246 l-12 4 M114 246 l12 4" stroke="#ef7fa0" stroke-width="4" stroke-linecap="round"/>
      </g>
      <g class="anim-body">
        <path d="M150 128 l26 -6 -14 16z" fill="#f48aa8"/>
        <ellipse cx="114" cy="132" rx="44" ry="26" fill="#ff9fbb"/>
        <path d="M100 124 q24 -18 52 0 q-24 6 -52 0z" fill="#f47b9c"/>
        <path d="M80 128 C 60 110, 66 82, 82 70 C 96 58, 92 40, 80 36" stroke="#ff9fbb" stroke-width="13" fill="none" stroke-linecap="round"/>
      </g>
      <g class="anim-head" style="transform-origin: 80px 36px">
        <circle cx="78" cy="32" r="15" fill="#ff9fbb"/>
        <path d="M66 32 C 56 34, 52 44, 56 54 L60 52 C 58 46, 60 40, 66 38 Z" fill="#fff4e0"/>
        <path d="M56 50 L60 58 L63 52 Z" fill="#2b2a4c"/>
        <circle cx="80" cy="28" r="3.5" fill="#2b2a4c"/><circle cx="81" cy="27" r="1.2" fill="#fff"/>
        <ellipse cx="86" cy="36" rx="4" ry="2.4" fill="#ff6f96" opacity="0.6"/>
      </g>
    </svg>`,
};

export const animalArt = (id) => ART[id]?.() ?? '';
