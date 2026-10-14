// Mounts one screen at a time into #screen-root with a soft cross-fade.
const root = () => document.getElementById('screen-root');

export function mountScreen(className, html) {
  const host = root();
  for (const old of host.querySelectorAll('.screen:not(.is-leaving)')) {
    old.classList.add('is-leaving');
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    const done = () => old.remove();
    old.addEventListener('animationend', done, { once: true });
    setTimeout(done, 800); // reduced-motion / no-animation safety net
  }
  const el = document.createElement('section');
  el.className = `screen ${className}`;
  el.innerHTML = html;
  host.appendChild(el);
  return el;
}

/** Moves focus to the screen's heading so keyboard & screen-reader users land in the right place. */
export function focusScreen(el) {
  const target = el.querySelector('[data-autofocus]') ?? el.querySelector('h1, h2');
  if (!target) return;
  if (!target.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
