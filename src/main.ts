import './styles.css';
import './match-board.css';
import { normalizeCode } from './net/protocol';
import { createLocal, createOnline, joinRoom, type SavedTable, type Session } from './net/session';
import { prefs, profileForWire } from './prefs';
import { GameView } from './ui/game';
import { renderHome } from './ui/club';
import { h } from './ui/dom';
import { openProfile } from './ui/profile';
import { closeDialogs } from './ui/dialog';

const app = document.getElementById('app')!;
let teardown: (() => void) | null = null;
let navigation = 0;

function clear() {
  navigation++;
  closeDialogs();
  teardown?.();
  teardown = null;
  app.innerHTML = '';
}

function go(path: string) {
  if (location.pathname !== path) history.pushState(null, '', path);
  route();
}

function home(notice?: string) {
  clear();
  if (location.pathname !== '/') history.replaceState(null, '', '/');
  teardown = renderHome(app, {
    host: () => void hostTable(),
    join: (code) => go(`/t/${code}`),
    practice: () => play(createLocal(profileForWire(), { ...prefs().lastSettings, mode: 'practice', teamSize: 1 })),
    bot: (level) => play(createLocal(profileForWire(), { ...prefs().lastSettings, mode: 'match', teamSize: 1 }, undefined, level)),
    passAndPlay: (second) => play(createLocal(profileForWire(), { ...prefs().lastSettings, mode: 'match', teamSize: 1 }, { ...second, cue: 'ebony' })),
  }, notice);
}

function play(session: Session, code?: string) {
  clear();
  let view: GameView;
  try { view = new GameView(session, {
    leave: () => {
      if (session.isHost) {
        try { sessionStorage.removeItem('baize.hosting'); } catch { /* storage blocked */ }
      }
      go('/');
    },
    reconnect: code ? () => { session.leave(); void joinTable(code); } : undefined,
  }); } catch {
    session.leave();
    home('The 3D table could not start. Enable hardware acceleration or try a browser with WebGL support.');
    return;
  }
  view.mount(app);
  teardown = () => {
    view.destroy();
    session.leave();
    if (session.isHost && session.room?.kind === 'online') {
      try { sessionStorage.removeItem('baize.hosting'); } catch { /* storage blocked */ }
    }
  };
}

function connecting(text: string) {
  clear();
  const controller = new AbortController();
  teardown = () => controller.abort();
  const el = h('div.connect', {}, h('div.card.panel', { role: 'status', style: 'justify-items:center;text-align:center' }, h('div.spinner'), h('h2', {}, text), h('p', {}, 'Connecting to your private table.'), h('button.btn.btn-ghost', { type: 'button', onclick: () => go('/') }, 'Back to the club')));
  app.append(el);
  return { id: navigation, signal: controller.signal };
}

async function hostTable(saved?: SavedTable) {
  const attempt = connecting(saved ? 'Reopening your table…' : 'Opening your table…');
  try {
    const settings = { ...(saved?.room.settings ?? prefs().lastSettings), mode: 'match' as const };
    const s = await createOnline(profileForWire(), settings, saved, attempt.signal);
    if (attempt.id !== navigation) { s.leave(); return; }
    history.replaceState(null, '', `/t/${s.host!.room.code}`);
    play(s);
  } catch {
    if (attempt.id !== navigation) return;
    try { sessionStorage.removeItem('baize.hosting'); } catch { /* storage blocked */ }
    home('Could not open a table. Check your connection and try again.');
  }
}

async function joinTable(code: string) {
  const attempt = connecting(`Finding table ${code}…`);
  try {
    const s = await joinRoom(code, profileForWire(), attempt.signal);
    if (attempt.id !== navigation) { s.leave(); return; }
    play(s, code);
  } catch (e) {
    if (attempt.id !== navigation) return;
    const msg = (e as Error).message === 'not-found'
      ? `No table with the code ${code} is open. Check the code, or ask your friend to send the link again.`
      : `Could not reach table ${code}. Check your connection and try again.`;
    home(msg);
  }
}

function askName(then: () => void) {
  const path = location.pathname;
  home();
  history.replaceState(null, '', path);
  openProfile({ requireName: true, title: 'Pull up a chair', done: then, onCancel: () => go('/') });
}

function route() {
  const m = location.pathname.match(/^\/t\/([A-Za-z0-9]{6})\/?$/);
  if (!m) return home();
  const code = normalizeCode(m[1]);
  let saved: SavedTable | null = null;
  try {
    const raw = sessionStorage.getItem('baize.hosting');
    if (raw) saved = JSON.parse(raw) as SavedTable;
  } catch { /* storage blocked */ }
  if (saved && saved.code === code) return void hostTable(saved);
  if (!prefs().profile.name.trim()) return askName(() => void joinTable(code));
  void joinTable(code);
}

window.addEventListener('popstate', route);
route();
