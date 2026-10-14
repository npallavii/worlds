// Leo the lion explorer — original layered SVG on the shared humanoid rig.
// His tail uses the rig's "antenna" channel, so it wags with every clip.

export const LEO = {
  id: 'leo',
  name: 'Leo',
  pivots: {
    ground: '100 250',
    neck: '100 128',
    shoulderL: '56 146', shoulderR: '144 146',
    elbowL: '56 175', elbowR: '144 175',
    hipL: '82 202', hipR: '118 202',
    antenna: '128 198',
    eyeL: '86 80', eyeR: '114 80',
  },
  svg: (uid) => {
    const mane = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const r = 50;
      return `<circle cx="${(100 + Math.cos(a) * r).toFixed(1)}" cy="${(82 + Math.sin(a) * r * 0.92).toFixed(1)}" r="${i % 2 ? 17 : 20}" fill="${i % 2 ? '#d97a33' : '#c4632a'}"/>`;
    }).join('');
    return `
<svg class="character character-leo" viewBox="0 0 200 270" role="img" aria-label="Leo, a friendly lion explorer">
  <defs>
    <linearGradient id="${uid}-fur" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbc865"/><stop offset="1" stop-color="#eda544"/>
    </linearGradient>
    <linearGradient id="${uid}-vest" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cdb57d"/><stop offset="1" stop-color="#b49a5f"/>
    </linearGradient>
    <radialGradient id="${uid}-mane" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0.55" stop-color="#e0843a"/><stop offset="1" stop-color="#b9572a"/>
    </radialGradient>
  </defs>

  <ellipse data-part="shadow" cx="100" cy="252" rx="54" ry="9" fill="#5a3a1a" opacity="0.18"/>

  <g data-part="root">
    <!-- Tail (behind everything) -->
    <g data-part="antenna">
      <path d="M126 196 C 150 196, 160 176, 168 160" stroke="#eda544" stroke-width="8" fill="none" stroke-linecap="round"/>
      <ellipse cx="170" cy="154" rx="10" ry="13" fill="#c4632a" transform="rotate(30 170 154)"/>
    </g>

    <!-- Legs: shorts, fur, explorer boots -->
    <g data-part="legL">
      <rect x="76" y="206" width="13" height="32" rx="6.5" fill="url(#${uid}-fur)"/>
      <path d="M70 194 h24 v18 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4z" fill="url(#${uid}-vest)"/>
      <path d="M68 248 a14 11 0 0 1 28 0 Z" fill="#7a4f2e"/>
      <rect x="66" y="244" width="32" height="7" rx="3.5" fill="#5c3a20"/>
    </g>
    <g data-part="legR">
      <rect x="111" y="206" width="13" height="32" rx="6.5" fill="url(#${uid}-fur)"/>
      <path d="M106 194 h24 v18 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4z" fill="url(#${uid}-vest)"/>
      <path d="M104 248 a14 11 0 0 1 28 0 Z" fill="#7a4f2e"/>
      <rect x="102" y="244" width="32" height="7" rx="3.5" fill="#5c3a20"/>
    </g>

    <!-- Arms -->
    <g data-part="armL">
      <rect x="50" y="146" width="12" height="31" rx="6" fill="url(#${uid}-fur)"/>
      <g data-part="forearmL">
        <rect x="50" y="173" width="12" height="26" rx="6" fill="url(#${uid}-fur)"/>
        <circle cx="56" cy="203" r="10" fill="#ffd894" stroke="#d9913a" stroke-width="2.5"/>
        <path d="M51 207 v3 M56 208 v3 M61 207 v3" stroke="#d9913a" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M46 140 h20 v14 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6z" fill="url(#${uid}-vest)"/>
    </g>
    <g data-part="armR">
      <rect x="138" y="146" width="12" height="31" rx="6" fill="url(#${uid}-fur)"/>
      <g data-part="forearmR">
        <rect x="138" y="173" width="12" height="26" rx="6" fill="url(#${uid}-fur)"/>
        <circle cx="144" cy="203" r="10" fill="#ffd894" stroke="#d9913a" stroke-width="2.5"/>
        <path d="M139 207 v3 M144 208 v3 M149 207 v3" stroke="#d9913a" stroke-width="2" stroke-linecap="round"/>
      </g>
      <path d="M134 140 h20 v14 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6z" fill="url(#${uid}-vest)"/>
    </g>

    <!-- Torso: fur body + explorer vest + compass badge -->
    <rect x="58" y="132" width="84" height="76" rx="28" fill="url(#${uid}-fur)"/>
    <ellipse cx="100" cy="176" rx="20" ry="26" fill="#ffe3b0"/>
    <path d="M60 150 a28 28 0 0 1 22 -18 l8 70 h-16 a14 14 0 0 1 -14 -14z" fill="url(#${uid}-vest)"/>
    <path d="M140 150 a28 28 0 0 0 -22 -18 l-8 70 h16 a14 14 0 0 0 14 -14z" fill="url(#${uid}-vest)"/>
    <rect x="66" y="170" width="14" height="12" rx="3" fill="#a38a52"/>
    <rect x="120" y="170" width="14" height="12" rx="3" fill="#a38a52"/>
    <circle cx="127" cy="152" r="7" fill="#ffc857" stroke="#8a6a2a" stroke-width="2"/>
    <path d="M127 147 l2 5 -2 5 -2 -5z" fill="#c4632a"/>

    <!-- Head -->
    <g data-part="head">
      <circle cx="100" cy="82" r="56" fill="url(#${uid}-mane)"/>
      ${mane}
      <circle cx="66" cy="50" r="11" fill="#f6bd55"/><circle cx="66" cy="50" r="6" fill="#f7a7a0"/>
      <circle cx="134" cy="50" r="11" fill="#f6bd55"/><circle cx="134" cy="50" r="6" fill="#f7a7a0"/>
      <ellipse cx="100" cy="86" rx="38" ry="36" fill="url(#${uid}-fur)"/>

      <!-- Explorer hat -->
      <path d="M66 46 Q100 6 134 46 Z" fill="#e8d6a6"/>
      <rect x="66" y="38" width="68" height="7" rx="2" fill="#a0442c"/>
      <ellipse cx="100" cy="47" rx="46" ry="7" fill="#d9c48e"/>
      <path d="M80 28 q20 -12 40 0" stroke="#fff" stroke-width="3" fill="none" opacity="0.5" stroke-linecap="round"/>

      <path d="M78 68 q8 -5 15 0 M107 68 q8 -5 15 0" stroke="#8a4a22" stroke-width="3" fill="none" stroke-linecap="round"/>

      <g data-part="eyes">
        <g data-part="eyeL">
          <g data-part="eyeOpenL"><ellipse cx="86" cy="80" rx="5.5" ry="7.5" fill="#3a2a1e"/><circle cx="87.8" cy="77" r="2" fill="#fff"/></g>
          <path data-part="eyeHappyL" opacity="0" d="M80 82 Q86 74 92 82" stroke="#3a2a1e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        </g>
        <g data-part="eyeR">
          <g data-part="eyeOpenR"><ellipse cx="114" cy="80" rx="5.5" ry="7.5" fill="#3a2a1e"/><circle cx="115.8" cy="77" r="2" fill="#fff"/></g>
          <path data-part="eyeHappyR" opacity="0" d="M108 82 Q114 74 120 82" stroke="#3a2a1e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        </g>
      </g>

      <ellipse cx="72" cy="96" rx="6" ry="3.5" fill="#ff9b8a" opacity="0.6"/>
      <ellipse cx="128" cy="96" rx="6" ry="3.5" fill="#ff9b8a" opacity="0.6"/>
      <ellipse cx="100" cy="100" rx="19" ry="13" fill="#ffe8bf"/>
      <path d="M93 90 h14 a3 3 0 0 1 2 5 l-7 6 a3 3 0 0 1 -4 0 l-7 -6 a3 3 0 0 1 2 -5z" fill="#7a3e2a"/>
      <g fill="#c48a52"><circle cx="88" cy="101" r="1.4"/><circle cx="84" cy="104" r="1.4"/><circle cx="112" cy="101" r="1.4"/><circle cx="116" cy="104" r="1.4"/></g>

      <path data-part="mouthSmile" d="M92 104 Q100 111 108 104" stroke="#7a3e2a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path data-part="mouthGrin" opacity="0" d="M90 103 Q100 118 110 103 Z" fill="#9b3f36"/>
      <ellipse data-part="mouthOpen" opacity="0" cx="100" cy="107" rx="6" ry="3" fill="#9b3f36"/>
    </g>
  </g>
</svg>`;
  },
};
