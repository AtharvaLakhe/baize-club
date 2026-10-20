import './styles.css';
import { normalizeCode } from './net/protocol';
import { createLocal, createOnline, joinRoom, type SavedTable, type Session } from './net/session';
import { prefs, profileForWire, savePrefs } from './prefs';
import { GameView } from './ui/game';
import { renderHome } from './ui/home';
import { h } from './ui/dom';

const app = document.getElementById('app')!;
let teardown: (() => void) | null = null;

function clear() {
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
    passAndPlay: (second) => play(createLocal(profileForWire(), { ...prefs().lastSettings, mode: 'match', teamSize: 1 }, { ...second, cue: 'ebony' })),
  }, notice);
}

function play(session: Session, code?: string) {
  clear();
  const view = new GameView(session, {
    leave: () => {
      if (session.isHost) {
        try { sessionStorage.removeItem('baize.hosting'); } catch { /* storage blocked */ }
      }
      session.leave();
      go('/');
    },
    reconnect: code ? () => { session.leave(); void joinTable(code); } : undefined,
  });
  view.mount(app);
  teardown = () => view.destroy();
}

function connecting(text: string) {
  clear();
  const el = h('div.connect', {}, h('div.card.panel', { role: 'status' }, h('h2', {}, text), h('p', {}, 'This usually takes a second or two.')));
  app.append(el);
}

async function hostTable(saved?: SavedTable) {
  connecting(saved ? 'Reopening your table…' : 'Opening your table…');
  try {
    const settings = { ...(saved?.room.settings ?? prefs().lastSettings), mode: 'match' as const };
    const s = await createOnline(profileForWire(), settings, saved);
    history.replaceState(null, '', `/t/${s.host!.room.code}`);
    play(s);
  } catch {
    try { sessionStorage.removeItem('baize.hosting'); } catch { /* storage blocked */ }
    home('Could not open a table. Check your connection and try again.');
  }
}

async function joinTable(code: string) {
  connecting(`Finding table ${code}…`);
  try {
    const s = await joinRoom(code, profileForWire());
    play(s, code);
  } catch (e) {
    const msg = (e as Error).message === 'not-found'
      ? `No table with the code ${code} is open. Check the code, or ask your friend to send the link again.`
      : `Could not reach table ${code}. Check your connection and try again.`;
    home(msg);
  }
}

function askName(then: () => void) {
  clear();
  const input = h('input.input', { placeholder: 'Your name', maxlength: 20, autocomplete: 'nickname' }) as HTMLInputElement;
  const el = h('div.connect', {}, h('form.card.panel', {
    onsubmit: (e: Event) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return input.focus();
      savePrefs({ profile: { ...prefs().profile, name } });
      then();
    },
  },
  h('h2', {}, 'Pull up a chair'),
  h('p', {}, 'A friend has invited you to a snooker table. What should they call you?'),
  input,
  h('button.btn.btn-brass', { type: 'submit' }, 'Join the table'),
  ));
  app.append(el);
  input.focus();
}

function route() {
  const m = location.pathname.match(/^\/t\/([A-Za-z0-9]{4,8})\/?$/);
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
