const dialogs = new Set<() => void>();

/** Focus stays inside a modal and returns to its trigger on dismissal. */
export function mountDialog(scrim: HTMLElement, dismiss: () => void): () => void {
  const previous = document.activeElement as HTMLElement | null;
  const card = scrim.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')!;
  card.setAttribute('aria-modal', 'true');
  card.tabIndex = -1;
  const background = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== scrim && !el.inert);
  for (const el of background) el.inert = true;
  const focusable = () => Array.from(card.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]')).filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dismiss(); }
    if (e.key !== 'Tab') return;
    const items = focusable();
    const first = items[0] ?? card, last = items.at(-1) ?? card;
    if (!card.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === card)) { e.preventDefault(); first.focus(); }
  };
  let closed = false;
  const pointer = (e: PointerEvent) => { if (e.target === scrim) dismiss(); };
  const close = () => {
    if (closed) return;
    closed = true;
    dialogs.delete(close);
    document.removeEventListener('keydown', key, true);
    scrim.removeEventListener('pointerdown', pointer);
    scrim.remove();
    for (const el of background) el.inert = false;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', key, true);
  scrim.addEventListener('pointerdown', pointer);
  dialogs.add(close);
  document.body.append(scrim);
  (card.querySelector<HTMLElement>('input') ?? focusable()[0] ?? card).focus();
  return close;
}

export function closeDialogs() { for (const close of [...dialogs]) close(); }
