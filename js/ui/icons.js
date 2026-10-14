// Inline line icons (24×24, stroke-based) so they inherit currentColor.
const P = {
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  music:'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  freeze: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6 7-2.5 0-4-1.3-5.3-3.4L4 14.2a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
  letter: '<path d="M6 20L12 4l6 16M8.3 14h7.4"/>',
  shape: '<path d="M12 3l9 16H3z"/><circle cx="12" cy="14" r="3"/>',
  body: '<circle cx="12" cy="4.5" r="2"/><path d="M4 9l8 1.5L20 9M12 10.5V15M12 15l-4 6M12 15l4 6"/>',
  lean: '<circle cx="14" cy="5" r="2"/><path d="M13 8l-3 7M10 15l-2 6M10 15l4 6M11.5 10.5L17 12M11.5 10.5L6 9"/><path d="M3 18c1-3 3-5 5-6" opacity=".5"/>',
  row: '<path d="M3 17c3 2 6 2 9 0s6-2 9 0"/><path d="M6 13l6-9M18 13L12 4"/>',
  recipe: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  basket: '<path d="M3 10h18l-2 10H5z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M15 14v3M12 14v3"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/>',
  badge: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',
  chest: '<path d="M3 11h18v9H3zM3 11V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v3"/><rect x="10" y="10" width="4" height="5" rx="1"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${P[name] ?? ''}</svg>`;
}
