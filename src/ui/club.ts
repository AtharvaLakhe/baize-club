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
import { animate } from './motion';

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
    h('span.club-mark', { 'aria-hidden': 'true' }, h('span', {}, '8')),
    h('span', {}, 'Obsidian', h('small', {}, 'The online billiards club')));
  const nav = h('header.nav', {}, h('div.wrap', {}, brand,
    h('nav.nav-links', { 'aria-label': 'Club navigation' },
      h('a.active', { href: '#club' }, 'The club'),
      h('a', { href: '#play' }, 'Play a frame'),
      h('button.nav-help', { type: 'button', onclick: () => maybeShowHowTo(true) }, 'How to play')),
    h('div.nav-right', {}, h('a.repo-link', { href: REPO_URL, target: '_blank', rel: 'noopener', 'aria-label': 'View source on GitHub' }, icon('github', 19)), me)));

  const gameSeg = h('div.seg.game-seg', { role: 'group', 'aria-label': 'Game' });
  const tableLabel = h('span');
  const gameNote = h('span');
  const paintGame = () => {
    const current = prefs().lastSettings.game;
    if (!gameSeg.childElementCount) gameSeg.append(...([['snooker', 'Snooker'], ['pool8', '8-ball pool']] as const).map(([g, label]) => h('button', {
      type: 'button', 'data-game': g,
      onclick: () => {
        const ls = prefs().lastSettings;
        savePrefs({ lastSettings: { ...ls, game: g, tableTheme: defaultCloth(g, ls.tableTheme) } });
        paintGame(); attract?.setGame(g);
        animate(canvas, [{ opacity: .3, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }], 420);
      },
    }, label)));
    for (const button of gameSeg.querySelectorAll<HTMLButtonElement>('button')) button.setAttribute('aria-pressed', String(button.dataset.game === current));
    tableLabel.textContent = current === 'pool8' ? 'Classic 8-ball pool' : 'Championship snooker';
    gameNote.textContent = current === 'pool8' ? 'Solids, stripes, then the eight.' : 'Reds, colours, and a little composure.';
  };
  paintGame();

  const canvas = h('canvas.attract', { 'aria-hidden': 'true' }) as HTMLCanvasElement;
  let manualPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  const syncPlayback = () => { if (attract) attract.paused = manualPaused || !visible || document.hidden; };
  const pause = h('button.preview-control', { type: 'button', 'aria-label': manualPaused ? 'Play table preview' : 'Pause table preview', 'aria-pressed': String(manualPaused), onclick: () => {
    manualPaused = !manualPaused;
    if (!manualPaused) attract?.start();
    syncPlayback();
    pause.setAttribute('aria-pressed', String(manualPaused));
    pause.setAttribute('aria-label', manualPaused ? 'Play table preview' : 'Pause table preview');
    pause.textContent = manualPaused ? 'Play preview' : 'Pause preview';
  } }, manualPaused ? 'Play preview' : 'Pause preview');
  const preview = h('div.table-preview', {},
    h('div.preview-head', {}, h('span.preview-live', {}, h('span.dot'), 'A table is always waiting'), h('span.preview-badge', {}, icon('eye', 14), 'Live preview')),
    h('div.preview-scene', {}, h('img.preview-fallback', { src: '/table.png', alt: 'An Obsidian billiards table', hidden: true }), canvas),
    h('div.preview-foot', {}, h('div', {}, tableLabel, h('small', {}, gameNote)),
      h('div.preview-tools', {}, pause, h('button.preview-control.rerack', { type: 'button', 'aria-label': 'Re-rack the preview table', onclick: () => { attract?.setGame(prefs().lastSettings.game); animate(canvas, [{ opacity: .35 }, { opacity: 1 }], 400); } }, icon('replay', 16)))));
  const hero = h('section.club-hero.wrap', { id: 'club', 'aria-labelledby': 'hero-title' },
    h('div.hero-copy', {},
      h('div.club-invitation', {}, h('span.short-rule'), 'Good games. Better company.'),
      h('h1', { id: 'hero-title' }, 'The table', h('br'), 'is yours.'),
      h('p.hero-description', {}, 'A quiet corner of the internet for a proper game. Play snooker or pool with friends, wherever the evening finds you.'),
      h('a.btn.btn-gold.btn-lg.hero-link', { href: '#play' }, 'Take your seat', icon('arrow', 18)),
      h('p.hero-aside', {}, 'No accounts. No downloads. Just play.')),
    preview);

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
    { id: 'friends', icon: 'users', name: 'With friends', text: 'Your table. Your invite link.', cta: 'Open a private table' },
    { id: 'computer', icon: 'bot', name: 'The computer', text: 'A worthy opponent, any time.', cta: 'Play the computer' },
    { id: 'practice', icon: 'target', name: 'Solo practice', text: 'Find your touch. Take your time.', cta: 'Start practising' },
    { id: 'local', icon: 'swap', name: 'Pass-and-play', text: 'Two players. One screen.', cta: 'Set up pass-and-play' },
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
      animate(start, [{ opacity: .4, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }]);
      if (mode === 'computer') animate(difficulty, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }]);
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

  const play = h('section.play-section.wrap', { id: 'play', 'aria-labelledby': 'play-title' },
    h('div.section-heading', {}, h('div', {}, h('p.section-note', {}, 'Pull up a chair'), h('h2', { id: 'play-title' }, 'How are we playing?')), gameSeg),
    notice ? h('div.notice-bar', { role: 'alert' }, notice) : null,
    h('div.play-layout', {},
      h('div.play-console', {}, modeGrid, difficulty,
        h('div.start-row', {}, h('span', {}, icon('check', 15), 'Free to play. Always private.'), start)),
      h('form.join-console', { onsubmit: join, 'aria-labelledby': 'join-title' },
        h('span.invite-icon', {}, icon('link', 23)),
        h('h3', { id: 'join-title' }, 'Already invited?'),
        h('p', { id: 'join-help' }, 'Enter your friend’s table code, or paste their invite link.'),
        h('label.join-label', { for: 'table-code' }, 'Table code or invite link'),
        h('div.join-row', {}, code, h('button.btn', { type: 'submit' }, 'Join table', icon('arrow', 16))), joinError)));

  const detail = (ic: IconName, title: string, text: string) => h('div.club-detail', {}, icon(ic, 21), h('div', {}, h('h3', {}, title), h('p', {}, text)));
  const details = h('section.club-details.wrap', { 'aria-label': 'The club experience' },
    detail('target', 'A proper game', 'Real spin, considered physics, and rules that feel familiar.'),
    detail('users', 'Keep good company', 'Private links, doubles, spectators, and a little table talk.'),
    detail('palette', 'Set the atmosphere', 'Seven cloths, seven cues. Make yourself at home.'));
  const footer = h('footer.footer', {}, h('div.wrap', {},
    h('span.footer-brand', {}, 'Obsidian', h('small', {}, 'A little competition. A good evening.')),
    h('div.footer-right', {}, h('span', {}, 'Made by ', h('a', { href: 'https://github.com/AtharvaLakhe', target: '_blank', rel: 'noopener' }, 'Atharva Lakhe')),
      h('a', { href: `${REPO_URL}/issues`, target: '_blank', rel: 'noopener' }, 'Report a bug'),
      h('a', { href: REPO_URL, target: '_blank', rel: 'noopener' }, 'Open source', icon('github', 15)))));
  site.append(h('a.skip-link', { href: '#play' }, 'Skip to play'), nav, h('main', {}, hero, play, details), footer);
  root.append(site);
  animate(hero.querySelector('.hero-copy')!, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 700);
  animate(preview, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 800, 100);

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
  } catch {
    canvas.hidden = true;
    preview.querySelector<HTMLImageElement>('.preview-fallback')!.hidden = false;
    preview.querySelector('.preview-badge')!.textContent = 'Table preview';
    preview.querySelector('.preview-tools')!.remove();
  }
  const resize = new ResizeObserver(() => attract?.resize());
  resize.observe(preview);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; syncPlayback(); });
  io.observe(preview);
  const visibility = () => syncPlayback();
  document.addEventListener('visibilitychange', visibility);
  preview.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced.matches) return;
    const r = preview.getBoundingClientRect();
    preview.style.setProperty('--spot-x', `${((e.clientX - r.left) / r.width) * 100}%`);
    preview.style.setProperty('--spot-y', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
  preview.addEventListener('pointerleave', () => { preview.style.removeProperty('--spot-x'); preview.style.removeProperty('--spot-y'); });
  return () => { resize.disconnect(); io.disconnect(); reduced.removeEventListener('change', onMotionChange); document.removeEventListener('visibilitychange', visibility); attract?.stop(); site.remove(); };
}
