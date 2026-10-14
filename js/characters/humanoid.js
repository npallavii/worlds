// A template for friendly child-explorer characters on the shared rig (same part names
// and pivots as Bloop and Leo). Each guide supplies its colours, hair and hat, so all of them
// get every animation clip for free. The hat uses the rig's "antenna" channel to wobble.

const PIVOTS = {
  ground: '100 250',
  neck: '100 128',
  shoulderL: '56 146', shoulderR: '144 146',
  elbowL: '56 175', elbowR: '144 175',
  hipL: '82 202', hipR: '118 202',
  antenna: '100 52',
  eyeL: '86 86', eyeR: '114 86',
};

const HAIR = {
  short: (c) => `<path d="M64 80 C 62 46, 138 46, 136 80 C 128 62, 72 62, 64 80 Z" fill="${c}"/>`,
  curly: (c) => `${Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI + (i / 10) * Math.PI;
    return `<circle cx="${(100 + Math.cos(a) * 36).toFixed(1)}" cy="${(80 + Math.sin(a) * 34).toFixed(1)}" r="11" fill="${c}"/>`;
  }).join('')}`,
  bob: (c) => `<path d="M60 96 C 54 40, 146 40, 140 96 L 132 96 C 132 70, 68 70, 68 96 Z" fill="${c}"/>`,
};

const HATS = {
  wizard: () => `
    <path d="M66 58 L104 -4 Q112 -10 116 0 L134 58 Z" fill="#6d4fc2"/>
    <path d="M104 -4 Q118 -14 126 -2" stroke="#6d4fc2" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="58" rx="46" ry="9" fill="#5a3fa8"/>
    <rect x="70" y="46" width="62" height="8" rx="3" fill="#ffc857"/>
    <path d="M96 22 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill="#fff3c4"/>
    <circle cx="116" cy="34" r="2.5" fill="#fff3c4"/><circle cx="84" cy="40" r="2" fill="#fff3c4"/>`,
  captain: () => `
    <path d="M62 56 Q60 26 100 24 Q140 26 138 56 Z" fill="#fffdf8"/>
    <rect x="62" y="48" width="76" height="12" rx="4" fill="#24407a"/>
    <path d="M64 60 Q100 74 136 60 L132 64 Q100 78 68 64 Z" fill="#1a2f5c"/>
    <circle cx="100" cy="42" r="7" fill="#ffc857"/>
    <path d="M100 37 v10 M96 45 q4 4 8 0 M97 39 h6" stroke="#24407a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  chef: () => `
    <rect x="68" y="44" width="64" height="16" rx="4" fill="#fffdf8" stroke="#e6ddcf" stroke-width="2"/>
    <circle cx="78" cy="30" r="17" fill="#fffdf8"/><circle cx="100" cy="20" r="20" fill="#fffdf8"/><circle cx="122" cy="30" r="17" fill="#fffdf8"/>
    <rect x="66" y="30" width="68" height="20" fill="#fffdf8"/>
    <path d="M86 30 v14 M100 26 v18 M114 30 v14" stroke="#ece4d6" stroke-width="2" stroke-linecap="round"/>`,
};

const OUTFITS = {
  // Long robe with stars and a gold belt.
  robe: (o) => `
    <path d="M60 140 Q100 124 140 140 L148 218 Q100 230 52 218 Z" fill="${o.main}"/>
    <path d="M100 132 V224" stroke="${o.trim}" stroke-width="4"/>
    <rect x="62" y="176" width="76" height="8" rx="4" fill="${o.trim}"/>
    <circle cx="80" cy="200" r="3" fill="#fff3c4"/><circle cx="122" cy="156" r="2.5" fill="#fff3c4"/><circle cx="118" cy="206" r="3" fill="#fff3c4"/>`,
  // Sea captain's coat with gold buttons and a white collar.
  coat: (o) => `
    <rect x="58" y="132" width="84" height="78" rx="24" fill="${o.main}"/>
    <path d="M84 132 L100 152 L116 132 Z" fill="#fffdf8"/>
    <path d="M100 152 V208" stroke="${o.dark}" stroke-width="3"/>
    <g fill="${o.trim}"><circle cx="92" cy="166" r="3.5"/><circle cx="92" cy="184" r="3.5"/><circle cx="108" cy="166" r="3.5"/><circle cx="108" cy="184" r="3.5"/></g>
    <rect x="58" y="196" width="84" height="8" rx="4" fill="${o.dark}"/>`,
  // Chef's jacket, double-breasted, with a red neckerchief.
  chef: (o) => `
    <rect x="58" y="132" width="84" height="78" rx="24" fill="#fffdf8" stroke="#ece4d6" stroke-width="2"/>
    <path d="M80 132 Q100 150 120 132 L112 150 Q100 158 88 150 Z" fill="${o.trim}"/>
    <g fill="#d9cfbf"><circle cx="90" cy="168" r="3"/><circle cx="90" cy="184" r="3"/><circle cx="110" cy="168" r="3"/><circle cx="110" cy="184" r="3"/></g>
    <path d="M70 196 H130" stroke="${o.main}" stroke-width="6" stroke-linecap="round"/>`,
};

export function makeHumanoid({ id, name, label, skin, skinShade, hair, hairStyle, hat, outfit, sleeve, pants, shoes, lips = '#b5524a' }) {
  return {
    id,
    name,
    pivots: PIVOTS,
    svg: (uid) => `
<svg class="character character-${id}" viewBox="0 0 200 270" role="img" aria-label="${label}">
  <ellipse data-part="shadow" cx="100" cy="252" rx="52" ry="9" fill="#2b2a4c" opacity="0.16"/>
  <g data-part="root">
    <g data-part="legL">
      <rect x="74" y="200" width="16" height="40" rx="7" fill="${pants}"/>
      <path d="M66 248 a15 11 0 0 1 30 0 Z" fill="${shoes}"/><rect x="64" y="244" width="34" height="7" rx="3.5" fill="${shoes}"/>
    </g>
    <g data-part="legR">
      <rect x="110" y="200" width="16" height="40" rx="7" fill="${pants}"/>
      <path d="M104 248 a15 11 0 0 1 30 0 Z" fill="${shoes}"/><rect x="102" y="244" width="34" height="7" rx="3.5" fill="${shoes}"/>
    </g>
    <g data-part="armL">
      <rect x="49" y="144" width="14" height="33" rx="7" fill="${sleeve}"/>
      <g data-part="forearmL">
        <rect x="50" y="172" width="12" height="26" rx="6" fill="${sleeve}"/>
        <circle cx="56" cy="202" r="9" fill="${skin}"/>
      </g>
    </g>
    <g data-part="armR">
      <rect x="137" y="144" width="14" height="33" rx="7" fill="${sleeve}"/>
      <g data-part="forearmR">
        <rect x="138" y="172" width="12" height="26" rx="6" fill="${sleeve}"/>
        <circle cx="144" cy="202" r="9" fill="${skin}"/>
      </g>
    </g>
    ${OUTFITS[outfit.style](outfit)}
    <rect x="92" y="118" width="16" height="18" rx="6" fill="${skinShade}"/>
    <g data-part="head">
      <circle cx="62" cy="90" r="8" fill="${skinShade}"/><circle cx="138" cy="90" r="8" fill="${skinShade}"/>
      <circle cx="100" cy="86" r="38" fill="${skin}"/>
      ${HAIR[hairStyle](hair)}
      <g data-part="eyes">
        <g data-part="eyeL">
          <g data-part="eyeOpenL"><ellipse cx="86" cy="86" rx="5" ry="6.5" fill="#2b2a4c"/><circle cx="87.6" cy="83.5" r="1.8" fill="#fff"/></g>
          <path data-part="eyeHappyL" opacity="0" d="M80 88 Q86 80 92 88" stroke="#2b2a4c" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        </g>
        <g data-part="eyeR">
          <g data-part="eyeOpenR"><ellipse cx="114" cy="86" rx="5" ry="6.5" fill="#2b2a4c"/><circle cx="115.6" cy="83.5" r="1.8" fill="#fff"/></g>
          <path data-part="eyeHappyR" opacity="0" d="M108 88 Q114 80 120 88" stroke="#2b2a4c" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        </g>
      </g>
      <path d="M80 75 q6 -4 12 0 M108 75 q6 -4 12 0" stroke="${hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="76" cy="100" rx="6" ry="3.5" fill="#ff8a8a" opacity="0.45"/><ellipse cx="124" cy="100" rx="6" ry="3.5" fill="#ff8a8a" opacity="0.45"/>
      <path d="M98 92 q2 4 4 0" stroke="${skinShade}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path data-part="mouthSmile" d="M90 104 Q100 112 110 104" stroke="${lips}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path data-part="mouthGrin" opacity="0" d="M88 103 Q100 118 112 103 Z" fill="${lips}"/>
      <ellipse data-part="mouthOpen" opacity="0" cx="100" cy="107" rx="6" ry="3" fill="${lips}"/>
      <g data-part="antenna">${HATS[hat]()}</g>
    </g>
  </g>
</svg>`,
  };
}

export const WREN = makeHumanoid({
  id: 'wren', name: 'Wren', label: 'Wren, a little wizard with a starry hat',
  skin: '#f6d2b8', skinShade: '#e8b896', hair: '#d0702e', hairStyle: 'bob', hat: 'wizard',
  outfit: { style: 'robe', main: '#7e5fd6', trim: '#ffc857' }, sleeve: '#7e5fd6', pants: '#5a3fa8', shoes: '#3e2c78',
});

export const CORAL = makeHumanoid({
  id: 'coral', name: 'Captain Coral', label: 'Captain Coral, a cheerful submarine captain',
  skin: '#a86b4a', skinShade: '#8e5638', hair: '#2b1d16', hairStyle: 'curly', hat: 'captain', lips: '#6e2e2a',
  outfit: { style: 'coat', main: '#2f5aa8', dark: '#1a2f5c', trim: '#ffc857' }, sleeve: '#2f5aa8', pants: '#1a2f5c', shoes: '#2b2a4c',
});

export const PEPPER = makeHumanoid({
  id: 'pepper', name: 'Chef Pepper', label: 'Chef Pepper, a cheerful chef',
  skin: '#e9b98f', skinShade: '#d39d72', hair: '#5a3a22', hairStyle: 'short', hat: 'chef',
  outfit: { style: 'chef', main: '#7fbf6a', trim: '#e8584a' }, sleeve: '#fffdf8', pants: '#3e4a6e', shoes: '#2b2a4c',
});
