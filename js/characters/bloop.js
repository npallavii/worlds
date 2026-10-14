// Bloop the Blue Robot — original layered SVG rig.
// Every animatable piece carries data-part="…"; pivots tell the controller where joints are.

export const BLOOP = {
  id: 'bloop',
  name: 'Bloop',
  pivots: {
    ground: '100 250',
    neck: '100 128',
    shoulderL: '56 146', shoulderR: '144 146',
    elbowL: '56 175', elbowR: '144 175',
    hipL: '82 202', hipR: '118 202',
    antenna: '100 34',
    eyeL: '82 77', eyeR: '118 77',
  },
  svg: (uid) => `
<svg class="character character-bloop" viewBox="0 0 200 270" role="img" aria-label="Bloop, a friendly blue robot">
  <defs>
    <linearGradient id="${uid}-body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4fa3f7"/><stop offset="0.55" stop-color="#3b8beb"/><stop offset="1" stop-color="#2fc4c0"/>
    </linearGradient>
    <linearGradient id="${uid}-head" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#5cb0fa"/><stop offset="1" stop-color="#3482e0"/>
    </linearGradient>
    <linearGradient id="${uid}-limb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3ed1c8"/><stop offset="1" stop-color="#2bb3a8"/>
    </linearGradient>
    <radialGradient id="${uid}-glow"><stop offset="0" stop-color="#bffaff"/><stop offset="0.5" stop-color="#8ff4ff" stop-opacity="0.55"/><stop offset="1" stop-color="#8ff4ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${uid}-bulb"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ffb938"/></radialGradient>
  </defs>

  <ellipse data-part="shadow" cx="100" cy="252" rx="54" ry="9" fill="#2b2a4c" opacity="0.16"/>

  <g data-part="root">
    <!-- Legs (behind torso) -->
    <g data-part="legL">
      <rect x="75" y="198" width="14" height="40" rx="7" fill="url(#${uid}-limb)"/>
      <circle cx="82" cy="219" r="6" fill="#c9dcf5" stroke="#2a6cc4" stroke-width="2"/>
      <path d="M66 248 a16 12 0 0 1 32 0 Z" fill="#2a6cc4"/>
      <rect x="64" y="244" width="36" height="7" rx="3.5" fill="#1f4f99"/>
    </g>
    <g data-part="legR">
      <rect x="111" y="198" width="14" height="40" rx="7" fill="url(#${uid}-limb)"/>
      <circle cx="118" cy="219" r="6" fill="#c9dcf5" stroke="#2a6cc4" stroke-width="2"/>
      <path d="M102 248 a16 12 0 0 1 32 0 Z" fill="#2a6cc4"/>
      <rect x="100" y="244" width="36" height="7" rx="3.5" fill="#1f4f99"/>
    </g>

    <!-- Left arm (viewer's left) -->
    <g data-part="armL">
      <rect x="50" y="146" width="12" height="31" rx="6" fill="url(#${uid}-limb)"/>
      <g data-part="forearmL">
        <rect x="50" y="173" width="12" height="26" rx="6" fill="url(#${uid}-limb)"/>
        <circle cx="56" cy="203" r="10" fill="#4fa3f7" stroke="#2a6cc4" stroke-width="2.5"/>
        <path d="M50 206 q6 5 12 0" stroke="#2a6cc4" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>
      <circle cx="56" cy="175" r="6" fill="#c9dcf5" stroke="#2a6cc4" stroke-width="2"/>
      <circle cx="56" cy="146" r="10" fill="#2a6cc4"/>
    </g>
    <!-- Right arm -->
    <g data-part="armR">
      <rect x="138" y="146" width="12" height="31" rx="6" fill="url(#${uid}-limb)"/>
      <g data-part="forearmR">
        <rect x="138" y="173" width="12" height="26" rx="6" fill="url(#${uid}-limb)"/>
        <circle cx="144" cy="203" r="10" fill="#4fa3f7" stroke="#2a6cc4" stroke-width="2.5"/>
        <path d="M138 206 q6 5 12 0" stroke="#2a6cc4" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>
      <circle cx="144" cy="175" r="6" fill="#c9dcf5" stroke="#2a6cc4" stroke-width="2"/>
      <circle cx="144" cy="146" r="10" fill="#2a6cc4"/>
    </g>

    <!-- Torso -->
    <rect x="58" y="132" width="84" height="76" rx="28" fill="url(#${uid}-body)"/>
    <rect x="72" y="150" width="56" height="44" rx="20" fill="#e8f8ff" opacity="0.32"/>
    <path d="M66 146 q8 -10 22 -10" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.45"/>
    <circle class="chest-glow" cx="100" cy="172" r="22" fill="url(#${uid}-glow)"/>
    <circle cx="100" cy="172" r="11" fill="#1d2550"/>
    <path d="M100 165 l2.2 4.6 5 .6 -3.7 3.4 1 5 -4.5 -2.5 -4.5 2.5 1 -5 -3.7 -3.4 5 -.6Z" fill="#8ff4ff"/>
    <rect x="80" y="198" width="40" height="8" rx="4" fill="#2a6cc4" opacity="0.5"/>

    <!-- Neck -->
    <rect x="90" y="120" width="20" height="16" rx="6" fill="#c9dcf5" stroke="#2a6cc4" stroke-width="2"/>

    <!-- Head -->
    <g data-part="head">
      <g data-part="antenna">
        <path d="M100 36 V16" stroke="#2a6cc4" stroke-width="5" stroke-linecap="round"/>
        <circle class="antenna-glow" cx="100" cy="12" r="14" fill="url(#${uid}-glow)"/>
        <circle cx="100" cy="12" r="7.5" fill="url(#${uid}-bulb)" stroke="#e89a1c" stroke-width="1.5"/>
      </g>
      <circle cx="42" cy="82" r="11" fill="#3ed1c8" stroke="#2a6cc4" stroke-width="3"/>
      <circle cx="42" cy="82" r="4" fill="#2a6cc4"/>
      <circle cx="158" cy="82" r="11" fill="#3ed1c8" stroke="#2a6cc4" stroke-width="3"/>
      <circle cx="158" cy="82" r="4" fill="#2a6cc4"/>

      <rect x="44" y="32" width="112" height="96" rx="40" fill="url(#${uid}-head)"/>
      <ellipse cx="74" cy="46" rx="18" ry="7" fill="#fff" opacity="0.28" transform="rotate(-18 74 46)"/>

      <!-- Face screen -->
      <rect x="57" y="50" width="86" height="62" rx="26" fill="#1d2550"/>
      <rect x="57" y="50" width="86" height="62" rx="26" fill="none" stroke="#14193a" stroke-width="3"/>

      <g data-part="eyes">
        <g data-part="eyeL">
          <g data-part="eyeOpenL">
            <rect x="75" y="67" width="14" height="20" rx="7" fill="#8ff4ff"/>
            <circle cx="79.5" cy="72" r="2.6" fill="#fff"/>
          </g>
          <path data-part="eyeHappyL" opacity="0" d="M74 80 Q82 69 90 80" stroke="#8ff4ff" stroke-width="5" fill="none" stroke-linecap="round"/>
        </g>
        <g data-part="eyeR">
          <g data-part="eyeOpenR">
            <rect x="111" y="67" width="14" height="20" rx="7" fill="#8ff4ff"/>
            <circle cx="115.5" cy="72" r="2.6" fill="#fff"/>
          </g>
          <path data-part="eyeHappyR" opacity="0" d="M110 80 Q118 69 126 80" stroke="#8ff4ff" stroke-width="5" fill="none" stroke-linecap="round"/>
        </g>
      </g>

      <ellipse cx="68" cy="96" rx="6.5" ry="3.8" fill="#ff9db0" opacity="0.75"/>
      <ellipse cx="132" cy="96" rx="6.5" ry="3.8" fill="#ff9db0" opacity="0.75"/>

      <path data-part="mouthSmile" d="M89 95 Q100 105 111 95" stroke="#8ff4ff" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path data-part="mouthGrin" opacity="0" d="M86 93 Q100 112 114 93 Z" fill="#8ff4ff"/>
      <ellipse data-part="mouthOpen" opacity="0" cx="100" cy="99" rx="8" ry="3" fill="#8ff4ff"/>
    </g>
  </g>
</svg>`,
};
