const running = new WeakMap<Element, Animation>();

/** State updates never depend on motion finishing. Rapid choices replace the prior animation. */
export function animate(el: Element, frames: Keyframe[], duration = 280, delay = 0) {
  running.get(el)?.cancel();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animation = el.animate(frames, { duration, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
  running.set(el, animation);
}
