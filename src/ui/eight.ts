/** A small, interruptible pointer toy. The native button is also the tap/keyboard alternative. */
export function attachEight(ball: HTMLButtonElement, stage: HTMLElement, reveal: () => void): () => void {
  const events = new AbortController();
  const signal = events.signal;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pointer: { id: number; x: number; y: number } | null = null;
  let suppressClick = false;
  let raf = 0;
  let last = 0;
  let x = 0, y = 0, lookX = 0, lookY = 0;
  let targetX = 0, targetY = 0, targetLookX = 0, targetLookY = 0;

  const paint = () => {
    ball.style.setProperty('--drag-x', `${x.toFixed(2)}px`);
    ball.style.setProperty('--drag-y', `${y.toFixed(2)}px`);
    ball.style.setProperty('--roll', `${(x / 2.7).toFixed(2)}deg`);
    ball.style.setProperty('--look-x', `${lookX.toFixed(2)}deg`);
    ball.style.setProperty('--look-y', `${lookY.toFixed(2)}deg`);
  };
  const tick = (now: number) => {
    if (document.hidden || reduced.matches || stage.dataset.open === 'true') { raf = last = 0; return; }
    const dt = Math.min(.05, (now - last) / 1000 || .016);
    last = now;
    const k = 1 - Math.exp(-dt * (pointer ? 25 : 13));
    x += (targetX - x) * k;
    y += (targetY - y) * k;
    lookX += (targetLookX - lookX) * k;
    lookY += (targetLookY - lookY) * k;
    paint();
    if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(targetLookX - lookX) + Math.abs(targetLookY - lookY) > .08) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; }
  };
  const animate = () => {
    if (reduced.matches || document.hidden || stage.dataset.open === 'true') return;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const settle = () => {
    targetX = targetY = targetLookX = targetLookY = 0;
    animate();
  };
  const stop = () => {
    if (pointer && ball.hasPointerCapture(pointer.id)) ball.releasePointerCapture(pointer.id);
    pointer = null;
    ball.classList.remove('dragging');
    cancelAnimationFrame(raf); raf = last = 0;
    x = y = lookX = lookY = targetX = targetY = targetLookX = targetLookY = 0;
    paint();
  };
  const rollAway = () => {
    stage.style.setProperty('--release-x', `${x.toFixed(2)}px`);
    stage.style.setProperty('--release-y', `${y.toFixed(2)}px`);
    stage.style.setProperty('--release-roll', `${(x / 2.7).toFixed(2)}deg`);
    stop(); reveal();
  };

  ball.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || stage.dataset.open === 'true') return;
    suppressClick = false;
    stage.dataset.returning = 'false';
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    ball.setPointerCapture(event.pointerId);
    ball.classList.add('dragging');
  }, { signal });
  stage.addEventListener('pointermove', (event) => {
    if (stage.dataset.open === 'true') return;
    if (pointer?.id === event.pointerId) {
      targetX = Math.max(-180, Math.min(180, event.clientX - pointer.x));
      targetY = Math.max(-65, Math.min(65, (event.clientY - pointer.y) * .45));
    } else if (event.pointerType === 'mouse') {
      const rect = stage.getBoundingClientRect();
      targetLookX = Math.max(-10, Math.min(10, (event.clientX - rect.left - rect.width / 2) / rect.width * 20));
      targetLookY = Math.max(-8, Math.min(8, (event.clientY - rect.top - rect.height / 2) / rect.height * -16));
    }
    animate();
  }, { signal });
  ball.addEventListener('pointerup', (event) => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    suppressClick = Math.hypot(dx, event.clientY - pointer.y) > 8;
    if (ball.hasPointerCapture(event.pointerId)) ball.releasePointerCapture(event.pointerId);
    pointer = null;
    ball.classList.remove('dragging');
    if (Math.abs(dx) > 36) rollAway();
    else settle();
  }, { signal });
  ball.addEventListener('pointercancel', () => { suppressClick = true; stop(); }, { signal });
  ball.addEventListener('lostpointercapture', () => { if (pointer) stop(); }, { signal });
  ball.addEventListener('click', (event) => {
    if (event.detail > 0 && suppressClick) { suppressClick = false; return; }
    rollAway();
  }, { signal });
  stage.addEventListener('pointerleave', () => { if (!pointer) settle(); }, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal });
  reduced.addEventListener('change', stop, { signal });
  return () => { events.abort(); stop(); };
}
