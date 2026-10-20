// "You" in one place: name, picture, cue and the display and control preferences.

import { setVolume } from '../audio/sound';
import { prefs, savePrefs } from '../prefs';
import { AVATARS } from '../render/themes';
import { cuePicker } from './cuepreview';
import { h } from './dom';
import { icon } from './icons';

export function switchRow(name: string, text: string, value: boolean, onChange: (v: boolean) => void, disabled = false): HTMLElement {
  const input = h('input', { type: 'checkbox', role: 'switch', checked: value, disabled, onchange: (e: Event) => onChange((e.target as HTMLInputElement).checked) });
  return h('label.switch', {}, h('span', {}, h('b', {}, name), h('small', {}, text)), input);
}

/**
 * Open the profile card. With `requireName`, the card won't close until there is a name, and
 * `done` runs afterwards: used before opening or joining a table.
 */
export function openProfile(opts: { requireName?: boolean; title?: string; done?: () => void; onChange?: () => void } = {}) {
  const p = prefs();
  const scrim = h('div.scrim', {});
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !opts.requireName) close(); };
  document.addEventListener('keydown', onKey);

  const preview = h('div.avatar.lg', {}, p.profile.avatar);
  const name = h('input.input', { id: 'profile-name', maxlength: 20, value: p.profile.name, placeholder: 'What should friends call you?', autocomplete: 'nickname' }) as HTMLInputElement;
  const err = h('small', { style: 'color:#fca5a5', hidden: true }, 'Add a name so friends know who they are playing.');

  const avatars = h('div.avatar-grid', { role: 'group', 'aria-label': 'Picture' });
  const paintAvatars = () => {
    avatars.innerHTML = '';
    for (const a of AVATARS) {
      avatars.append(h('button', {
        type: 'button', 'aria-label': a, 'aria-pressed': String(prefs().profile.avatar === a),
        onclick: () => { savePrefs({ profile: { ...prefs().profile, avatar: a } }); preview.textContent = a; paintAvatars(); opts.onChange?.(); },
      }, a));
    }
  };
  paintAvatars();

  const cues = h('div');
  const paintCues = () => {
    cues.innerHTML = '';
    cues.append(cuePicker(prefs().profile.cue, (id) => { savePrefs({ profile: { ...prefs().profile, cue: id } }); paintCues(); opts.onChange?.(); }));
  };
  paintCues();

  const settings = h('div', { style: 'display:grid;gap:8px' },
    switchRow('Sound', 'Cue strikes, clacks and pockets.', prefs().sound > 0, (v) => { savePrefs({ sound: v ? 0.8 : 0 }); setVolume(v ? 0.8 : 0); }),
    switchRow('Left-handed controls', 'Power bar on the right, fine aim on the left.', prefs().leftHanded, (v) => { savePrefs({ leftHanded: v }); opts.onChange?.(); }),
    switchRow('Numbers on balls', 'Prints each ball’s value on it, for anyone who finds the colours hard to tell apart.', prefs().ballLabels, (v) => savePrefs({ ballLabels: v })),
  );

  const panes = { look: h('div', { style: 'display:grid;gap:14px' }, avatars, cues), settings };
  const body = h('div', {}, panes.look);
  const tab = (id: keyof typeof panes, label: string) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': String(id === 'look'),
    onclick: (e: Event) => {
      for (const b of tabs.querySelectorAll('button')) b.setAttribute('aria-selected', 'false');
      (e.currentTarget as HTMLElement).setAttribute('aria-selected', 'true');
      body.replaceChildren(panes[id]);
    },
  }, label);
  const tabs = h('div.tabs', { role: 'tablist' }, tab('look', 'Picture and cue'), tab('settings', 'Settings'));

  const save = () => {
    const n = name.value.trim();
    if (!n && opts.requireName) { err.hidden = false; name.focus(); return; }
    savePrefs({ profile: { ...prefs().profile, name: n } });
    opts.onChange?.();
    close();
    opts.done?.();
  };

  scrim.append(h('form.card.panel', { role: 'dialog', 'aria-labelledby': 'profile-title', onsubmit: (e: Event) => { e.preventDefault(); save(); } },
    h('div.card-head', {},
      h('h2', { id: 'profile-title' }, opts.title ?? 'Your profile'),
      opts.requireName ? null : h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('x')),
    ),
    h('div.profile-top', {}, preview, h('label.field', { for: 'profile-name' }, h('span', {}, 'Name'), name)),
    err,
    tabs,
    body,
    h('button.btn.btn-gold.btn-lg.btn-block', { type: 'submit' }, opts.done ? 'Continue' : 'Save'),
  ));
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim && !opts.requireName) close(); });
  document.body.append(scrim);
  setTimeout(() => (p.profile.name ? null : name.focus()), 30);
}

/** The first time someone sits at a table, show them how to play. */
export function maybeShowHowTo(force = false) {
  if (!force && prefs().seenHowTo) return;
  savePrefs({ seenHowTo: true });
  const scrim = h('div.scrim', {});
  const close = () => scrim.remove();
  scrim.append(h('div.card.panel', { role: 'dialog', 'aria-labelledby': 'howto-title' },
    h('div.card-head', {},
      h('h2', { id: 'howto-title' }, 'How to play'),
      h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('x')),
    ),
    h('ol.steps', {},
      h('li', {}, h('span', {}, h('b', {}, 'Aim'), ' by pointing at the table. Use the ridged wheel (or the arrow keys) for tiny adjustments.')),
      h('li', {}, h('span', {}, h('b', {}, 'Pull back'), ' on the power bar, or click and drag back on the table, then let go to strike.')),
      h('li', {}, h('span', {}, h('b', {}, 'Spin'), ': tap the white ball to choose where the tip hits. Low for screw back, high for follow, sides for side.')),
      h('li', {}, h('span', {}, h('b', {}, 'Ball in hand'), ': drag the cue ball anywhere inside the D before you shoot.')),
    ),
    h('p', {}, 'Snooker: pot a red, then any colour, and repeat. When the reds are gone, clear the colours in order from yellow to black.'),
    h('p', {}, '8-ball: your first pot decides whether you are solids (1–7) or stripes (9–15). Clear your group, then sink the 8 to win. Sink it early and you lose.'),
    h('button.btn.btn-gold.btn-lg.btn-block', { type: 'button', onclick: close }, 'Got it'),
  ));
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(); });
  document.body.append(scrim);
}
