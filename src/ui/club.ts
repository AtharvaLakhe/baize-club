import type { BotLevel } from '../core/ai';
import { AVATARS } from '../render/themes';
import { normalizeCode } from '../net/protocol';
import { prefs, savePrefs } from '../prefs';
import { unlockAudio } from '../audio/sound';
import { h } from './dom';
import { icon, type IconName } from './icons';
import { openProfile, maybeShowHowTo } from './profile';
import { mountDialog } from './dialog';
import { defaultCloth } from './lobby';
import { REPO_URL } from './sharecard';
import { Attract, type HomeActions } from './home';
import { attachEight } from './eight';

function withName(go: () => void, refresh: () => void) {
  if (prefs().profile.name.trim()) return go();
  openProfile({ requireName: true, title: 'Take your seat', done: go, onChange: refresh });
}

export function renderHome(root: HTMLElement, actions: HomeActions, notice?: string): () => void {
  const site = h('div.site');
  let attract: Attract | null = null;
  let botLevel: BotLevel = (prefs().lastBot as BotLevel) ?? 'medium';
  type Mode = 'friends' | 'computer' | 'practice' | 'local';
  let mode: Mode = 'friends';

  const me = h('button.me-chip', { type: 'button', 'aria-label': 'Edit your profile' });
  const paintMe = () => {
    const p = prefs().profile;
    me.replaceChildren(h('span.avatar.sm', {}, p.avatar), h('span.nm', {}, p.name.trim() || 'Your profile'), icon('chevron', 14));
  };
  paintMe();
  me.addEventListener('click', () => openProfile({ onChange: paintMe }));
  const brand = h('a.logo', { href: '/', 'aria-label': 'Obsidian home' },
    h('span.eight-mark', { 'aria-hidden': 'true' }, '8'), h('span', {}, 'obsidian'));
  const nav = h('header.nav', {}, h('div.wrap', {}, brand,
    h('div.nav-right', {},
      h('button.nav-help', { type: 'button', onclick: () => maybeShowHowTo(true) }, 'How to play'),
      h('a.repo-link', { href: REPO_URL, target: '_blank', rel: 'noopener' }, 'GitHub'), me)));

  const gameSeg = h('div.seg.game-seg', { role: 'group', 'aria-label': 'Game' });
  const tableLabel = h('h2');
  const gameNote = h('span');
  const paintGame = () => {
    const current = prefs().lastSettings.game;
    if (!gameSeg.childElementCount) gameSeg.append(...([['snooker', 'Snooker'], ['pool8', '8-ball pool']] as const).map(([g, label]) => h('button', {
      type: 'button', 'data-game': g,
      onclick: () => {
        const ls = prefs().lastSettings;
        savePrefs({ lastSettings: { ...ls, game: g, tableTheme: defaultCloth(g, ls.tableTheme) } });
        paintGame(); attract?.setGame(g); setTableOpen(true);
      },
    }, label)));
    for (const button of gameSeg.querySelectorAll<HTMLButtonElement>('button')) button.setAttribute('aria-pressed', String(button.dataset.game === current));
    tableLabel.textContent = current === 'pool8' ? '8-ball pool' : 'Snooker';
    gameNote.textContent = current === 'pool8' ? 'Clear your group. Then the eight.' : 'Pot a red, then a colour.';
  };
  paintGame();

  const canvas = h('canvas.attract', { 'aria-hidden': 'true' }) as HTMLCanvasElement;
  let tableOpen = false;
  let manualPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  const syncPlayback = () => { if (attract) attract.paused = manualPaused || !tableOpen || !visible || document.hidden; };
  const pause = h('button.preview-control', { type: 'button', 'aria-label': manualPaused ? 'Play table preview' : 'Pause table preview', 'aria-pressed': String(manualPaused), onclick: () => {
    manualPaused = !manualPaused;
    if (!manualPaused) attract?.start();
    syncPlayback();
    pause.setAttribute('aria-pressed', String(manualPaused));
    pause.setAttribute('aria-label', manualPaused ? 'Play table preview' : 'Pause table preview');
    pause.textContent = manualPaused ? 'Play preview' : 'Pause preview';
  } }, manualPaused ? 'Play preview' : 'Pause preview');
  const ball = h('button.ball-gate', { type: 'button', 'aria-label': 'Roll the eight to reveal the table', 'aria-describedby': 'eight-hint', 'aria-controls': 'home-table', 'aria-expanded': 'false' },
    h('span.ball-surface', { 'aria-hidden': 'true' }, h('span.ball-number', {}, '8'), h('span.ball-glint'))) as HTMLButtonElement;
  const reset = h('button.preview-control.reset-eight', { type: 'button', hidden: true, 'aria-label': 'Bring back the eight', onclick: () => { setTableOpen(false); ball.focus(); } }, icon('replay', 15), 'Bring back the eight');
  const preview = h('section.table-preview', { 'aria-label': 'Table preview', 'data-open': 'false' },
    h('div.preview-head', {}, h('p.club-intro', {}, 'Pool. Snooker.', h('br'), 'Your people.'), gameSeg),
    h('h1.hero-brand', {}, 'obsidian'),
    h('span.orbit-ball.cue-ball', { 'aria-hidden': 'true' }),
    h('span.orbit-ball.blue-ball', { 'aria-hidden': 'true' }, h('i', {}, '2')),
    ball, h('p.eight-hint', { id: 'eight-hint' }, 'Drag or tap the eight. Make room for a game.'),
    h('div.preview-title', {}, tableLabel, h('span.preview-nudge', {}, 'Table preview')),
    h('div.preview-scene', { id: 'home-table' }, h('img.preview-fallback', { src: '/table.png', alt: 'An Obsidian billiards table', hidden: true }), canvas),
    h('div.preview-foot', {}, h('small', {}, gameNote),
      h('div.preview-tools', {}, reset, pause, h('button.preview-control.rerack', { type: 'button', 'aria-label': 'Re-rack the preview table', onclick: () => { attract?.setGame(prefs().lastSettings.game); setTableOpen(true); } }, icon('replay', 16), 'Re-rack'))));
  function setTableOpen(open: boolean) {
    preview.dataset.returning = String(!open && tableOpen);
    if (!open) for (const property of ['--release-x', '--release-y', '--release-roll']) preview.style.removeProperty(property);
    tableOpen = open;
    preview.dataset.open = String(open);
    reset.hidden = !open;
    ball.tabIndex = open ? -1 : 0;
    ball.setAttribute('aria-hidden', String(open));
    ball.setAttribute('aria-expanded', String(open));
    syncPlayback();
    if (open && manualPaused) attract?.still();
  }
  const detachEight = attachEight(ball, preview, () => { setTableOpen(true); reset.focus({ preventScroll: true }); });

  const passAndPlay = () => {
    const scrim = h('div.scrim');
    const name = h('input.input', { id: 'opponent-name', maxlength: 20, value: 'Player 2', autocomplete: 'off' }) as HTMLInputElement;
    scrim.append(h('form.card.panel', { role: 'dialog', 'aria-labelledby': 'opponent-title', onsubmit: (e: Event) => {
      e.preventDefault();
      const other = AVATARS.filter((a) => a !== prefs().profile.avatar);
      const second = { name: name.value.trim() || 'Player 2', avatar: other[Math.floor(Math.random() * other.length)] };
      close(); actions.passAndPlay(second);
    } },
      h('div.card-head', {}, h('h2', { id: 'opponent-title' }, 'Who’s across the table?'), h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: () => close() }, icon('x'))),
      h('p', {}, 'One screen, two players. Take turns and pass it over.'),
      h('label.field', { for: 'opponent-name' }, h('span', {}, 'Opponent name'), name),
      h('button.btn.btn-gold.btn-lg.btn-block', { type: 'submit' }, 'Start pass-and-play')));
    const close = mountDialog(scrim, () => close());
    name.select();
  };

  const levelSeg = h('div.seg', { role: 'group', 'aria-label': 'Computer difficulty' });
  const paintLevels = () => {
    if (!levelSeg.childElementCount) levelSeg.append(...(['easy', 'medium', 'hard'] as BotLevel[]).map((l) => h('button', {
      type: 'button', 'data-level': l, onclick: () => { botLevel = l; savePrefs({ lastBot: l }); paintLevels(); },
    }, l[0].toUpperCase() + l.slice(1))));
    for (const button of levelSeg.querySelectorAll<HTMLButtonElement>('button')) button.setAttribute('aria-pressed', String(button.dataset.level === botLevel));
  };
  paintLevels();
  const difficulty = h('div.difficulty', { hidden: true }, h('span', {}, 'Difficulty'), levelSeg);
  const modeChoices: Array<{ id: Mode; icon: IconName; name: string; text: string; cta: string }> = [
    { id: 'friends', icon: 'users', name: 'With friends', text: 'Send a private link', cta: 'Open a private table' },
    { id: 'computer', icon: 'bot', name: 'The computer', text: 'Three difficulty levels', cta: 'Play the computer' },
    { id: 'practice', icon: 'target', name: 'Solo practice', text: 'No opponent, no rush', cta: 'Start practising' },
    { id: 'local', icon: 'swap', name: 'Pass-and-play', text: 'Two players, one screen', cta: 'Set up pass-and-play' },
  ];
  const start = h('button.btn.btn-gold.btn-lg', { type: 'button', onclick: () => {
    unlockAudio();
    withName(() => {
      if (mode === 'computer') actions.bot(botLevel);
      else if (mode === 'practice') actions.practice();
      else if (mode === 'local') passAndPlay();
      else actions.host();
    }, paintMe);
  } });
  const modeGrid = h('div.play-modes', { role: 'group', 'aria-label': 'Play mode' });
  const paintModes = () => {
    if (!modeGrid.childElementCount) modeGrid.append(...modeChoices.map((o) => h('button.play-mode', { type: 'button', 'data-mode': o.id, 'aria-label': o.name, 'aria-describedby': `${o.id}-description`, onclick: () => {
      mode = o.id; paintModes();
    } },
      h('span.mode-icon', {}, icon(o.icon, 21)), h('span', {}, h('b', {}, o.name), h('small', { id: `${o.id}-description` }, o.text)), h('span.mode-check', {}, icon('check', 13)))));
    for (const button of modeGrid.querySelectorAll<HTMLButtonElement>('button')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    start.replaceChildren(modeChoices.find((o) => o.id === mode)!.cta, icon('arrow', 18));
    difficulty.hidden = mode !== 'computer';
  };
  paintModes();
  const code = h('input.input.code-input', { id: 'table-code', placeholder: 'ABC234', maxlength: 80, 'aria-describedby': 'join-help join-error', autocapitalize: 'characters', autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
  const joinError = h('p.form-error', { id: 'join-error', role: 'alert', hidden: true }, 'Enter the six-character table code or paste an invite link.');
  const join = (e: Event) => {
    e.preventDefault();
    const raw = code.value.trim();
    const linkCode = raw.match(/\/t\/([A-Za-z0-9]{6})\/?(?:[?#].*)?$/)?.[1];
    const candidate = linkCode ?? raw.replace(/[\s-]/g, '');
    if (!/^[A-Za-z0-9]{6}$/.test(candidate)) { joinError.hidden = false; code.setAttribute('aria-invalid', 'true'); code.focus(); return; }
    joinError.hidden = true; code.removeAttribute('aria-invalid');
    unlockAudio(); withName(() => actions.join(normalizeCode(candidate)), paintMe);
  };
  code.addEventListener('input', () => { code.removeAttribute('aria-invalid'); joinError.hidden = true; });

  const play = h('aside.play-section', { id: 'play', 'aria-labelledby': 'play-title' },
    h('div.setup-heading', {}, h('h2', { id: 'play-title' }, 'Make a night of it.'), h('p', {}, 'Choose your company. We’ll handle the table.')),
    notice ? h('div.notice-bar', { role: 'alert' }, notice) : null,
    h('div.play-console', {}, modeGrid, difficulty, h('div.start-row', {}, start)),
    h('form.join-console', { onsubmit: join, 'aria-labelledby': 'join-title' },
      h('h3', { id: 'join-title' }, 'Already got an invite?'),
      h('p', { id: 'join-help' }, 'Use a table code or paste your invite link.'),
      h('label.join-label', { for: 'table-code' }, 'Table code or invite link'),
      h('div.join-row', {}, code, h('button.btn', { type: 'submit' }, 'Join table', icon('arrow', 16))), joinError),
    h('p.setup-footnote', {}, 'No account. No download. Just a good game.'));

  const notes = h('section.house-notes.wrap', { 'aria-label': 'House notes' },
    h('h2', {}, 'A few house notes'),
    h('p', {}, h('b', {}, 'Snooker'), ' / Red, colour, repeat. Then clear yellow through black.'),
    h('p', {}, h('b', {}, '8-ball'), ' / First legal pot picks your group. Clear it, then the eight.'),
    h('button', { type: 'button', onclick: () => maybeShowHowTo(true) }, 'Rules & controls', icon('arrow', 16)));
  const footer = h('footer.footer', {}, h('div.wrap', {},
    h('span', {}, 'Built for a game with friends. Not another account.'),
    h('div.footer-right', {},
      h('a', { href: `${REPO_URL}/issues`, target: '_blank', rel: 'noopener' }, 'Report a bug'),
      h('a', { href: 'https://github.com/AtharvaLakhe', target: '_blank', rel: 'noopener' }, 'Made by Atharva Lakhe'))));
  site.append(h('a.skip-link', { href: '#play' }, 'Skip to play'), nav,
    h('main.playroom.wrap', {}, preview, play), notes, footer);
  root.append(site);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotionChange = () => {
    if (!reduced.matches) return;
    manualPaused = true;
    syncPlayback();
    attract?.still();
    pause.setAttribute('aria-pressed', 'true');
    pause.setAttribute('aria-label', 'Play table preview');
    pause.textContent = 'Play preview';
  };
  reduced.addEventListener('change', onMotionChange);
  try {
    attract = new Attract(canvas, () => ({ top: 5, right: 5, bottom: 5, left: 5 }));
    if (reduced.matches) attract.still();
    else attract.start();
    syncPlayback();
  } catch {
    canvas.hidden = true;
    preview.querySelector<HTMLImageElement>('.preview-fallback')!.hidden = false;
    pause.remove();
    preview.querySelector('.rerack')!.remove();
  }
  const resize = new ResizeObserver(() => attract?.resize());
  resize.observe(preview);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; syncPlayback(); });
  io.observe(preview);
  const visibility = () => syncPlayback();
  document.addEventListener('visibilitychange', visibility);
  return () => { detachEight(); resize.disconnect(); io.disconnect(); reduced.removeEventListener('change', onMotionChange); document.removeEventListener('visibilitychange', visibility); attract?.stop(); site.remove(); };
}
