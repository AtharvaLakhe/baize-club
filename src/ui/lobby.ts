// The lobby sits over the live table, so the host sees cloth and party rules change behind it.

import QRCode from 'qrcode';
import { chairCount, type MatchSettings, type Mutators, type Seat } from '../core/rules';
import type { Session } from '../net/session';
import { prefs, profileForWire, savePrefs } from '../prefs';
import { TABLE_THEMES } from '../render/themes';
import { cuePicker } from './cuepreview';
import { chipGroup, copyText, h, toast } from './dom';

const MUTATORS: Array<{ key: keyof Mutators; name: string; text: string }> = [
  { key: 'bigPockets', name: 'Bucket pockets', text: 'Pockets almost half as wide again. Good for beginners and long pots.' },
  { key: 'iceCloth', name: 'Ice cloth', text: 'Less than half the friction. Balls run and run.' },
  { key: 'rubberCushions', name: 'Rubber cushions', text: 'Cushions give back nearly everything you put in.' },
  { key: 'miniBalls', name: 'Marbles', text: 'Balls shrink by a fifth. The pockets suddenly look huge.' },
];

let cueOpen = false;

export function inviteUrl(code: string) {
  return `${location.origin}/t/${code}`;
}

export function buildLobby(session: Session, hooks: { leave(): void; preview(s: MatchSettings): void }): HTMLElement {
  const room = session.room!;
  const me = session.you;
  const isHost = room.hostId === me;
  const s = room.settings;
  const url = inviteUrl(room.code);

  const update = (patch: Partial<MatchSettings>) => {
    const next: MatchSettings = { ...s, ...patch, mutators: { ...s.mutators, ...(patch.mutators ?? {}) } };
    savePrefs({ lastSettings: next });
    hooks.preview(next);
    session.send({ t: 'settings', settings: next });
  };

  // ---- invite
  const qr = h('div.qr', { title: 'Scan to join from a phone' });
  const qrImg = h('img', { alt: 'QR code for the invite link', width: 92, height: 92 }) as HTMLImageElement;
  qr.append(qrImg);
  QRCode.toDataURL(url, { margin: 0, width: 184, color: { dark: '#1b1410', light: '#efe6d2' } })
    .then((d) => { qrImg.src = d; })
    .catch(() => qr.remove());

  const shareText = `Pull up a chair, I've opened a snooker table on Baize Club: ${url}`;
  const invite = h('section', {},
    h('div.invite', {},
      h('div', { style: 'display:grid; gap:10px; min-width:0' },
        h('div', {}, h('div', { style: 'color: var(--muted); font-size: .85rem' }, 'Table code'), h('div.code', {}, room.code)),
        h('div.link-box', {}, url),
        h('div.row', {},
          h('button.btn.btn-sm', { type: 'button', onclick: async () => toast((await copyText(url)) ? 'Invite link copied.' : 'Copy failed. Select the link instead.') }, 'Copy link'),
          'share' in navigator
            ? h('button.btn.btn-sm', { type: 'button', onclick: () => navigator.share({ title: 'Baize Club', text: shareText, url }).catch(() => {}) }, 'Share')
            : null,
        ),
      ),
      qr,
    ),
  );

  // ---- chairs, grouped by side: chairs are [A1, B1, A2, B2]
  const memberById = (id: string | null) => room.members.find((m) => m.id === id);
  const n = chairCount(s);
  const mine = room.seats.slice(0, n).indexOf(me);
  const chairEl = (chair: number) => {
    const mem = memberById(room.seats[chair]);
    if (mem) {
      const tags = [mem.id === me ? 'you' : '', mem.id === room.hostId ? 'host' : '', mem.connected ? '' : 'away'].filter(Boolean).join(', ');
      return h('div.seat.taken', {},
        h('span.face', {}, mem.avatar),
        h('span.nm', {}, mem.name),
        h('small', {}, tags || 'ready'),
        mem.id === me ? h('button.link', { type: 'button', onclick: () => session.send({ t: 'sit', seat: null }) }, 'Stand up') : null,
      );
    }
    return h('div.seat', {},
      h('span.face.empty', { 'aria-hidden': 'true' }, '+'),
      h('small', {}, 'Empty chair'),
      h('button.btn.btn-sm', { type: 'button', onclick: () => session.send({ t: 'sit', seat: chair }) }, mine === -1 ? 'Sit here' : 'Move here'),
    );
  };
  const seats = s.mode === 'practice'
    ? h('div.seats.one', {}, chairEl(0))
    : h('div.sides', {},
      ...([0, 1] as Seat[]).map((side) => h('div.side', {},
        h('div.side-name', {}, n === 4 ? `Side ${side === 0 ? 'A' : 'B'}` : `Player ${side + 1}`),
        chairEl(side),
        n === 4 ? chairEl(side + 2) : null,
      )),
    );
  const watchers = room.members.filter((m) => !room.seats.slice(0, n).includes(m.id) && m.connected);
  const seated = room.seats.slice(0, n).filter(Boolean).length;
  const need = n;

  // ---- your look
  const look = h('details.details', { open: cueOpen, ontoggle: (e: Event) => { cueOpen = (e.target as HTMLDetailsElement).open; } },
    h('summary', {}, 'Your cue'),
    cuePicker(prefs().profile.cue, (id) => {
      savePrefs({ profile: { ...prefs().profile, cue: id } });
      session.send({ t: 'profile', profile: profileForWire() });
    }),
  );

  // ---- settings
  const ro = !isHost;
  const settings = h('section.settings', {},
    h('h2.section-title', {}, isHost ? 'House rules' : 'House rules, set by the host'),
    fieldset('Players', chipGroup([
      { value: 1, label: 'Singles, 1 v 1' }, { value: 2, label: 'Doubles, 2 v 2' },
    ], s.teamSize ?? 1, (v) => update({ teamSize: v }), ro)),
    fieldset('Match length', chipGroup([1, 3, 5, 7].map((n) => ({ value: n, label: n === 1 ? 'One frame' : `Best of ${n}` })), s.bestOf, (v) => update({ bestOf: v }), ro)),
    fieldset('Reds', chipGroup([15, 10, 6, 3].map((n) => ({ value: n, label: String(n) })), s.reds, (v) => update({ reds: v }), ro)),
    fieldset('Shot clock', chipGroup([0, 20, 30, 60].map((n) => ({ value: n, label: n ? `${n}s` : 'Off' })), s.shotClock, (v) => update({ shotClock: v }), ro)),
    fieldset('Aiming guide', chipGroup([
      { value: 'full', label: 'Full paths' }, { value: 'ghost', label: 'Ghost ball' }, { value: 'line', label: 'Line only' }, { value: 'off', label: 'None' },
    ] as const, s.aimGuide, (v) => update({ aimGuide: v }), ro)),
    fieldset('Cloth', swatches(s.tableTheme, (id) => update({ tableTheme: id }), ro)),
    fieldset('Rules',
      toggle('Free ball', 'After a foul leaves you snookered, any ball counts as the ball on.', s.freeBall, (v) => update({ freeBall: v }), ro),
      toggle('Put them back in', 'After a foul you can make the offender play again.', s.playAgain, (v) => update({ playAgain: v }), ro),
    ),
    fieldset('Party rules',
      ...MUTATORS.map((m) => toggle(m.name, m.text, s.mutators[m.key], (v) => update({ mutators: { ...s.mutators, [m.key]: v } }), ro)),
    ),
  );

  const startBtn = isHost
    ? h('button.btn.btn-brass', { type: 'button', disabled: seated < need, onclick: () => session.send({ t: 'start' }), style: 'min-height:52px' }, seated < need ? `Waiting for players: ${seated} of ${need} seated` : 'Start the match')
    : h('p.status-line', {}, `Waiting for ${memberById(room.hostId)?.name ?? 'the host'} to start.`);

  return h('aside.lobby.panel', { 'aria-label': 'Table lobby' },
    h('div', { style: 'display:flex; justify-content:space-between; align-items:start; gap:12px' },
      h('h1', {}, isHost ? 'Your table is open' : `${memberById(room.hostId)?.name ?? 'A friend'}'s table`),
      h('button.btn.btn-sm.btn-ghost', { type: 'button', onclick: () => hooks.leave() }, 'Leave'),
    ),
    isHost ? h('p.lede-sm', {}, n === 4 ? 'Send the link to three friends. Each one takes an empty chair; anyone after that watches.' : 'Send the link to a friend. Whoever opens it sits down opposite you; anyone after that watches.') : null,
    invite,
    seats,
    watchers.length ? h('div.watchers', {}, `Watching: ${watchers.map((w) => `${w.avatar} ${w.name}`).join(', ')}`) : null,
    startBtn,
    look,
    settings,
  );
}

function fieldset(legend: string, ...children: HTMLElement[]) {
  return h('fieldset', {}, h('legend', {}, legend), ...children);
}

function toggle(name: string, text: string, value: boolean, onChange: (v: boolean) => void, disabled: boolean) {
  const input = h('input', { type: 'checkbox', checked: value, disabled, onchange: (e: Event) => onChange((e.target as HTMLInputElement).checked) });
  return h('label.toggle', {}, input, h('span', {}, h('b', {}, name), h('small', {}, text)));
}

function swatches(current: string, onPick: (id: string) => void, disabled: boolean) {
  const wrap = h('div.swatches', { role: 'group', 'aria-label': 'Cloth colour' });
  for (const t of TABLE_THEMES) {
    wrap.append(h('button.swatch', {
      type: 'button',
      title: t.name,
      'aria-label': t.name,
      'aria-pressed': String(t.id === current),
      disabled,
      style: `background: radial-gradient(circle at 40% 35%, ${t.clothLight}, ${t.cloth} 70%); border-color: ${t.rail}; box-shadow: 0 0 0 3px ${t.rail} inset, 0 0 0 4px ${t.trim} inset`,
      onclick: () => onPick(t.id),
    }));
  }
  return wrap;
}
