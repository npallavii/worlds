// Gentle pointer parallax for layered scenery. Layers declare data-depth (0 = fixed).
import { addTask } from '../core/scheduler.js';
import { getSettings } from '../core/settings.js';

export function attachParallax(container, { signal, id }) {
  const layers = [...container.querySelectorAll('[data-depth]')].map((el) => ({ el, depth: Number(el.dataset.depth) }));
  let tx = 0, ty = 0, x = 0, y = 0;

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { signal, passive: true });

  const remove = addTask(`parallax:${id}`, (dt) => {
    const still = getSettings().reducedMotion;
    const gx = still ? 0 : tx, gy = still ? 0 : ty;
    const k = 1 - Math.exp(-dt * 4);
    x += (gx - x) * k;
    y += (gy - y) * k;
    for (const { el, depth } of layers) {
      el.style.transform = `translate3d(${(-x * depth * window.innerWidth).toFixed(1)}px, ${(-y * depth * 0.5 * window.innerHeight).toFixed(1)}px, 0) scale(${1 + depth})`;
    }
  });
  signal.addEventListener('abort', remove, { once: true });
}
