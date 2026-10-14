// Illustrated vector scenery. Every function returns an SVG string.
// Gradient IDs get a unique suffix so the same scene can appear twice in the DOM
// (e.g. during a cross-fade between screens) without id collisions.

let uid = 0;
const nextId = () => `s${++uid}`;

/* ------------------------------------------------------------------ */
/* Hub: four parallax layers                                           */
/* ------------------------------------------------------------------ */

export function hubSceneLayers() {
  const id = nextId();
  const sky = `
  <svg class="layer" data-depth="0" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a9dcf5"/><stop offset="0.6" stop-color="#d9f0f7"/><stop offset="1" stop-color="#fff1d6"/>
      </linearGradient>
      <radialGradient id="sun-${id}"><stop offset="0" stop-color="#fff6cf"/><stop offset="0.45" stop-color="#ffe08a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#sky-${id})"/>
    <circle class="sun-glow" cx="1320" cy="170" r="190" fill="url(#sun-${id})"/>
    <circle cx="1320" cy="170" r="70" fill="#fff3c4"/>
    <g class="cloud cloud-a" fill="#fff" opacity="0.95">
      <ellipse cx="260" cy="150" rx="90" ry="38"/><ellipse cx="320" cy="128" rx="62" ry="46"/><ellipse cx="200" cy="138" rx="50" ry="34"/>
    </g>
    <g class="cloud cloud-b" fill="#fff" opacity="0.85">
      <ellipse cx="900" cy="100" rx="70" ry="28"/><ellipse cx="945" cy="84" rx="46" ry="34"/><ellipse cx="860" cy="92" rx="40" ry="26"/>
    </g>
    <g class="cloud cloud-c" fill="#fff" opacity="0.7">
      <ellipse cx="600" cy="230" rx="56" ry="20"/><ellipse cx="635" cy="218" rx="36" ry="24"/>
    </g>
    <g class="birds" fill="none" stroke="#6b6a90" stroke-width="4" stroke-linecap="round">
      <path d="M1040 260 q12 -12 24 0 q12 -12 24 0"/><path d="M1100 230 q9 -9 18 0 q9 -9 18 0"/>
    </g>
  </svg>`;

  const far = `
  <svg class="layer" data-depth="0.015" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <path d="M-50 560 Q180 400 420 520 T880 470 T1300 500 T1700 450 V900 H-50Z" fill="#cfc6ef"/>
    <path d="M-50 600 Q240 500 520 590 T1060 560 T1700 560 V900 H-50Z" fill="#b9b0e6" opacity="0.8"/>
  </svg>`;

  const mid = `
  <svg class="layer" data-depth="0.035" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <path d="M-50 660 Q300 560 640 640 T1260 620 T1700 610 V900 H-50Z" fill="#a8d99a"/>
    ${[ [160,640,1], [230,632,0.8], [1180,622,1], [1250,628,0.85], [1440,612,1.1] ].map(([x,y,s]) => `
      <g transform="translate(${x} ${y}) scale(${s})">
        <rect x="-5" y="-10" width="10" height="34" rx="4" fill="#9a7452"/>
        <circle cx="0" cy="-30" r="30" fill="#7fbf6e"/><circle cx="-14" cy="-20" r="20" fill="#8fcc7c"/>
      </g>`).join('')}
    <path d="M640 900 C 700 780, 820 740, 800 660" stroke="#f3dfb4" stroke-width="70" fill="none" stroke-linecap="round" opacity="0.9"/>
  </svg>`;

  const near = `
  <svg class="layer" data-depth="0.07" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <path d="M-50 760 Q260 690 600 750 T1240 740 T1700 720 V900 H-50Z" fill="#86c873"/>
    <path d="M-50 820 Q400 770 800 820 T1700 800 V900 H-50Z" fill="#74b862"/>
    ${[[90,790,'#ff9db0'],[150,808,'#ffd35c'],[1420,770,'#ffffff'],[1500,790,'#ff9db0'],[1360,800,'#ffd35c'],[520,812,'#ffffff']].map(([x,y,c]) => `
      <g transform="translate(${x} ${y})"><path d="M0 0 V28" stroke="#4f9a49" stroke-width="4"/>
        <circle r="9" fill="${c}"/><circle r="4" fill="#ffcf4a"/></g>`).join('')}
    <g class="butterfly" transform="translate(1180 640)">
      <g class="wing-flap"><ellipse cx="-9" cy="0" rx="10" ry="14" fill="#ffb3c7"/><ellipse cx="9" cy="0" rx="10" ry="14" fill="#ffb3c7"/></g>
      <rect x="-2" y="-9" width="4" height="18" rx="2" fill="#5d4b6e"/>
    </g>
  </svg>`;

  return sky + far + mid + near;
}

/* ------------------------------------------------------------------ */
/* World scenes (used for hub cards and as intro backdrops)           */
/* ------------------------------------------------------------------ */

const scenes = {
  safari(id) {
    return `
    <defs>
      <linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a8"/><stop offset="1" stop-color="#ffc07a"/></linearGradient>
      <radialGradient id="sn-${id}"><stop offset="0.3" stop-color="#fff6d2"/><stop offset="1" stop-color="#fff6d2" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#sk-${id})"/>
    <circle cx="232" cy="66" r="46" fill="url(#sn-${id})"/><circle cx="232" cy="66" r="22" fill="#fff4cc"/>
    <path d="M0 112 Q60 88 120 106 T240 100 T320 98 V180 H0Z" fill="#f0b46a"/>
    <g transform="translate(78 64)">
      <path d="M0 64 C2 40 -4 26 -2 12 M-2 30 C-12 22 -22 20 -30 16 M0 24 C10 16 22 12 30 12" stroke="#7a5638" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="-2" cy="8" rx="46" ry="11" fill="#8c9b4c"/><ellipse cx="-18" cy="2" rx="24" ry="8" fill="#9dad58"/><ellipse cx="14" cy="4" rx="22" ry="7" fill="#9dad58"/>
    </g>
    <g class="scene-extra" transform="translate(236 112)" fill="#c98a4a">
      <ellipse cx="0" cy="0" rx="20" ry="10"/><rect x="-16" y="4" width="4" height="12" rx="2"/><rect x="10" y="4" width="4" height="12" rx="2"/>
      <path d="M14 -4 L22 -34 L28 -32 L22 -2Z"/><ellipse cx="27" cy="-36" rx="7" ry="4"/>
      <circle cx="-6" cy="-2" r="2.4" fill="#a86a30"/><circle cx="4" cy="2" r="2.4" fill="#a86a30"/><circle cx="20" cy="-18" r="2" fill="#a86a30"/>
    </g>
    <path d="M0 136 Q80 120 160 134 T320 128 V180 H0Z" fill="#e39a45"/>
    <g stroke="#c9783a" stroke-width="2.5" stroke-linecap="round">
      ${[20,34,52,140,152,270,286,300].map((x,i) => `<path d="M${x} 180 q${i%2?4:-4} -16 ${i%2?2:-2} -26"/>`).join('')}
    </g>
    <g class="butterfly scene-extra" transform="translate(150 70)"><g class="wing-flap"><ellipse cx="-5" rx="5" ry="7" fill="#ff8fab"/><ellipse cx="5" rx="5" ry="7" fill="#ff8fab"/></g></g>`;
  },

  farm(id) {
    return `
    <defs><linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8f8"/><stop offset="1" stop-color="#eefaff"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#sk-${id})"/>
    <g fill="#fff"><ellipse cx="60" cy="36" rx="26" ry="10"/><ellipse cx="74" cy="30" rx="16" ry="11"/></g>
    <path d="M0 112 Q90 84 180 104 T320 96 V180 H0Z" fill="#a9db8a"/>
    <g transform="translate(250 50)">
      <path d="M-8 64 L-4 0 H4 L8 64Z" fill="#f1e3c8"/>
      <g class="spin" style="transform-origin:0px 0px"><g fill="#fff" stroke="#c9b48e" stroke-width="1.5">
        <rect x="-3" y="-34" width="6" height="34" rx="2"/><rect x="-3" y="-34" width="6" height="34" rx="2" transform="rotate(90)"/>
        <rect x="-3" y="-34" width="6" height="34" rx="2" transform="rotate(180)"/><rect x="-3" y="-34" width="6" height="34" rx="2" transform="rotate(270)"/>
      </g></g><circle r="4" fill="#d4554a"/>
    </g>
    <g transform="translate(110 66)">
      <path d="M-44 20 L0 -16 L44 20 V64 H-44Z" fill="#d4554a"/>
      <path d="M-50 22 L0 -20 L50 22" stroke="#8e3a33" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      <rect x="-15" y="30" width="30" height="34" fill="#a8423b"/>
      <path d="M-15 30 L15 64 M15 30 L-15 64" stroke="#fff" stroke-width="3"/><rect x="-15" y="30" width="30" height="34" fill="none" stroke="#fff" stroke-width="3"/>
      <rect x="-6" y="4" width="12" height="10" fill="#fff4d0" stroke="#fff" stroke-width="2"/>
    </g>
    <path d="M0 140 Q120 124 220 138 T320 134 V180 H0Z" fill="#86c16a"/>
    <g stroke="#e9d3a8" stroke-width="4" stroke-linecap="round">
      <path d="M0 146 H120"/><path d="M0 158 H120"/>${[8,40,72,104].map(x => `<path d="M${x} 138 V170"/>`).join('')}
    </g>
    <g class="float-bob scene-extra"><g transform="translate(200 96)">
      <path d="M-16 -10 H16 L12 16 Q0 22 -12 16Z" fill="#d98a5a"/><rect x="-18" y="-14" width="36" height="7" rx="3" fill="#c26f42"/>
      <text x="0" y="10" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="18" fill="#fff">A</text>
    </g></g>`;
  },

  castle(id) {
    return `
    <defs>
      <linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a46a6"/><stop offset="1" stop-color="#c3a8ee"/></linearGradient>
      <radialGradient id="gl-${id}"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#fff2a8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#sk-${id})"/>
    <g fill="#fff6c9">${[[30,24],[70,46],[120,18],[180,36],[290,22],[262,58],[18,70]].map(([x,y],i) => `<circle class="twinkle" style="animation-delay:${i*0.4}s" cx="${x}" cy="${y}" r="${i%3?1.8:2.6}"/>`).join('')}</g>
    <path d="M262 30 a16 16 0 1 0 14 24 a12 12 0 1 1 -14 -24Z" fill="#fff3c4"/>
    <path d="M0 140 Q80 120 160 132 T320 126 V180 H0Z" fill="#7b5fc4"/>
    <g transform="translate(160 70)">
      <rect x="-50" y="10" width="100" height="70" fill="#a48ce0"/>
      <rect x="-70" y="-4" width="28" height="84" fill="#9579d6"/><rect x="42" y="-4" width="28" height="84" fill="#9579d6"/>
      <rect x="-14" y="-30" width="28" height="110" fill="#b59ef0"/>
      <path d="M-74 -4 L-56 -36 L-38 -4Z" fill="#ff8fab"/><path d="M38 -4 L56 -36 L74 -4Z" fill="#ff8fab"/><path d="M-18 -30 L0 -64 L18 -30Z" fill="#ffc857"/>
      <path d="M-14 80 V58 a14 14 0 0 1 28 0 V80Z" fill="#4a3591"/>
      ${[[-56,14],[56,14],[0,-12],[-24,30],[24,30]].map(([x,y]) => `<rect x="${x-4}" y="${y}" width="8" height="12" rx="4" fill="#ffe59a"/>`).join('')}
    </g>
    <circle class="scene-extra" cx="48" cy="90" r="22" fill="url(#gl-${id})"/>
    <g class="float-bob scene-extra" fill="none" stroke-width="3.5" stroke-linejoin="round">
      <path d="M40 98 L48 82 L56 98Z" stroke="#fff2a8"/>
    </g>
    <g class="float-bob scene-extra" style="animation-delay:-1.2s"><rect x="262" y="88" width="18" height="18" rx="2" fill="none" stroke="#9ff1e8" stroke-width="3.5"/></g>
    <g class="float-bob scene-extra" style="animation-delay:-2.1s"><circle cx="230" cy="40" r="8" fill="none" stroke="#ffb3c7" stroke-width="3.5"/></g>`;
  },

  sea(id) {
    return `
    <defs><linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fdcf0"/><stop offset="1" stop-color="#2a86b4"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#sk-${id})"/>
    <g fill="#fff" opacity="0.14"><path d="M60 0 L90 0 L40 180 L10 180Z"/><path d="M170 0 L190 0 L160 180 L134 180Z"/><path d="M260 0 L276 0 L290 180 L262 180Z"/></g>
    <path d="M0 150 Q80 136 160 148 T320 142 V180 H0Z" fill="#f2d9a2"/>
    <g class="sway" style="transform-origin:40px 170px"><path d="M40 170 C30 140 52 128 40 100" stroke="#3fae86" stroke-width="7" fill="none" stroke-linecap="round"/></g>
    <g class="sway" style="transform-origin:290px 170px;animation-delay:-1s"><path d="M290 170 C300 140 280 126 292 96" stroke="#3fae86" stroke-width="7" fill="none" stroke-linecap="round"/></g>
    <g transform="translate(250 150)" fill="#ff8a8a"><path d="M0 0 C-6 -18 -18 -22 -16 -34 M0 0 C2 -20 10 -26 8 -40 M0 0 C10 -12 22 -14 24 -26" stroke="#ff8a8a" stroke-width="6" fill="none" stroke-linecap="round"/></g>
    <g transform="translate(88 146)"><path d="M0 0 a14 14 0 0 1 28 0Z" fill="#ffb37a"/><path d="M6 -2 a8 8 0 0 1 16 0" fill="#ff9a5a"/></g>
    <g class="swim">
      <g transform="translate(110 60)"><ellipse rx="16" ry="10" fill="#ffc857"/><path d="M14 0 L26 -9 L26 9Z" fill="#ffb02e"/><circle cx="-8" cy="-2" r="2.2" fill="#2b2a4c"/></g>
    </g>
    <g class="swim" style="animation-delay:-3s">
      <g transform="translate(220 96)"><ellipse rx="12" ry="7" fill="#ff8fab"/><path d="M-11 0 L-20 -7 L-20 7Z" fill="#ff6f96"/><circle cx="6" cy="-1" r="1.8" fill="#2b2a4c"/></g>
    </g>
    <g transform="translate(160 112)">
      <ellipse rx="34" ry="16" fill="#ffd23f"/><rect x="-8" y="-28" width="18" height="14" rx="5" fill="#ffd23f"/><rect x="6" y="-36" width="4" height="12" fill="#e5a800"/>
      <circle cx="-14" r="6" fill="#bfefff" stroke="#e5a800" stroke-width="2.5"/><circle cx="4" r="6" fill="#bfefff" stroke="#e5a800" stroke-width="2.5"/>
      <path d="M-34 0 L-46 -9 L-46 9Z" fill="#e5a800"/>
    </g>
    <g fill="none" stroke="#e8fbff" stroke-width="2">${[[190,80,4],[196,62,3],[188,46,5],[60,70,3],[66,52,4]].map(([x,y,r],i) => `<circle class="rise" style="animation-delay:${i*0.7}s" cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
  },

  kitchen(id) {
    return `
    <defs><pattern id="tl-${id}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fff1e2"/><path d="M0 0 H20 M0 0 V20" stroke="#f6dcc3" stroke-width="1.5"/></pattern></defs>
    <rect width="320" height="180" fill="url(#tl-${id})"/>
    <g transform="translate(36 22)"><rect width="74" height="56" rx="8" fill="#bfe8f8" stroke="#fff" stroke-width="6"/><circle cx="54" cy="16" r="8" fill="#fff3c4"/><path d="M37 0 V56 M0 28 H74" stroke="#fff" stroke-width="4"/></g>
    <g transform="translate(244 30)"><rect width="56" height="114" rx="10" fill="#8fdcc3"/><rect x="0" y="40" width="56" height="3" fill="#6cbfa5"/><rect x="8" y="14" width="5" height="18" rx="2.5" fill="#fff"/><rect x="8" y="50" width="5" height="22" rx="2.5" fill="#fff"/></g>
    <rect x="0" y="118" width="244" height="62" fill="#e9a77a"/><rect x="0" y="110" width="250" height="12" rx="4" fill="#f6d2b0"/>
    <g fill="#d38a5c">${[20,90,160].map(x => `<rect x="${x+20}" y="140" width="28" height="5" rx="2.5"/>`).join('')}</g>
    <g transform="translate(150 86)"><rect x="-26" y="0" width="52" height="24" rx="6" fill="#7a86b8"/><rect x="-32" y="-4" width="64" height="8" rx="4" fill="#5d6aa0"/>
      <g fill="#fff" opacity="0.8"><path class="steam" d="M-10 -8 q-6 -10 0 -18 q6 -8 0 -16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path class="steam" style="animation-delay:-0.8s" d="M10 -8 q-6 -10 0 -18 q6 -8 0 -16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>
    <g class="float-bob scene-extra"><g transform="translate(60 96)"><circle r="12" fill="#ff6b6b"/><path d="M0 -12 q2 -6 6 -8" stroke="#7a5638" stroke-width="2.5" fill="none"/><ellipse cx="7" cy="-15" rx="5" ry="2.6" fill="#7fc46a"/><circle cx="-4" cy="-4" r="2.4" fill="#fff" opacity="0.7"/></g></g>
    <g class="float-bob scene-extra" style="animation-delay:-1s"><g transform="translate(96 100)"><path d="M-12 -4 q12 20 26 -6 q-6 22 -26 6Z" fill="#ffd23f"/></g></g>
    <g class="float-bob scene-extra" style="animation-delay:-2s"><g transform="translate(212 92) rotate(30)"><path d="M-5 -14 L5 -14 L0 14Z" fill="#ff9a3c"/><path d="M-4 -14 l-3 -7 M0 -14 v-8 M4 -14 l3 -7" stroke="#6cbf5a" stroke-width="2.5" stroke-linecap="round"/></g></g>`;
  },
};

export function worldScene(worldId, { className = '', slice = true } = {}) {
  const id = nextId();
  const body = scenes[worldId]?.(id);
  if (!body) throw new Error(`Unknown world scene: ${worldId}`);
  return `<svg class="world-scene ${className}" viewBox="0 0 320 180" preserveAspectRatio="${slice ? 'xMidYMid slice' : 'xMidYMid meet'}" aria-hidden="true">${body}</svg>`;
}
