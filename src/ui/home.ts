// The front door: a live table where a ghost player knocks balls in, with the club card beside it.

import { DEFAULT_SETTINGS, rack } from '../core/rules';
import { buildTable } from '../core/table';
import type { Ball, ShotParams } from '../core/physics';
import { Orientations, ShotAnimator } from '../game/animator';
import { Renderer3D } from '../render/renderer3d';
import { AVATARS } from '../render/themes';
import { normalizeCode } from '../net/protocol';
import { prefs, savePrefs } from '../prefs';
import { unlockAudio } from '../audio/sound';
import { cuePicker } from './cuepreview';
import { h } from './dom';
import { REPO_URL } from './sharecard';

export interface HomeActions {
  host(): void;
  join(code: string): void;
  practice(): void;
  passAndPlay(second: { name: string; avatar: string }): void;
}

export class Attract {
  private renderer: Renderer3D;
  private table = buildTable();
  private balls: Ball[] = rack(DEFAULT_SETTINGS, this.table);
  private anim: ShotAnimator | null = null;
  private waitUntil = 0;
  private shots = 0;
  private raf = 0;
  private last = 0;
  private orients = new Orientations();
  private cue: { dx: number; dy: number; t0: number; params: ShotParams; start: { x: number; y: number } } | null = null;
  private cueGone: { dx: number; dy: number; t0: number; params: ShotParams; start: { x: number; y: number } } | null = null;

  constructor(readonly canvas: HTMLCanvasElement, private padding: () => { top: number; right: number; bottom: number; left: number }) {
    this.renderer = new Renderer3D(canvas, this.table, 'championship');
    this.renderer.setMode('orbit');
    this.renderer.setPadding(padding());
    this.waitUntil = performance.now() + 900;
  }

  start() {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    window.addEventListener('resize', this.onResize);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }

  private onResize = () => this.renderer.setPadding(this.padding());

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.anim) {
      if (this.anim.advance(dt, now)) {
        this.balls = this.anim.world.balls.map((b) => ({ ...b }));
        this.anim = null;
        this.waitUntil = now + 1100;
      }
    } else if (this.cue) {
      if (now - this.cue.t0 > 860) {
        // The home page is silent, but the hit still shows.
        this.anim = new ShotAnimator(this.table, this.balls, this.cue.params, this.orients, {
          sound: false,
          onImpact: (i) => this.renderer.impact(i.kind, i.x, i.y, i.speed),
        });
        const c = this.balls[0];
        this.renderer.strikeFx(c.x, c.y, this.cue.dx, this.cue.dy, this.cue.params.power * 0.5);
        this.cueGone = { ...this.cue, t0: now };
        this.cue = null;
      }
    } else if (now > this.waitUntil) {
      this.planShot(now);
    }

    const balls = this.anim ? this.anim.world.balls : this.balls;
    let cueDraw = null;
    if (this.cue) {
      // Slow pull back, then an accelerating push into the ball.
      const t = now - this.cue.t0;
      const c = this.balls[0];
      const back = 8 + this.cue.params.power * 260;
      const offsetMm = t < 640 ? 8 + (back - 8) * Math.sin((t / 640) * Math.PI * 0.5) : back * (1 - Math.pow(Math.min(1, (t - 640) / 220), 3));
      cueDraw = { x: c.x, y: c.y, dx: this.cue.dx, dy: this.cue.dy, pull: 0, offsetMm, skin: 'maple', alpha: 1 };
    } else if (this.cueGone && now - this.cueGone.t0 < 700) {
      const t = now - this.cueGone.t0;
      const c = this.cueGone.start;
      const through = -(30 + 150 * this.cueGone.params.power);
      cueDraw = { x: c.x, y: c.y, dx: this.cueGone.dx, dy: this.cueGone.dy, pull: 0, offsetMm: through * Math.min(1, t / 160), skin: 'maple', alpha: t > 450 ? 1 - (t - 450) / 250 : 1 };
    }
    this.renderer.draw({ balls, pots: this.anim?.pots ?? [], now, cue: cueDraw, guide: null, placing: null, labels: false, orient: (id) => this.orients.get(id), moving: !!this.anim });
  };

  private planShot(now: number) {
    const t = this.table;
    const reds = this.balls.filter((b) => b.on && b.id !== 0).length;
    if (this.shots >= 7 || reds < 4 || !this.balls[0].on) {
      this.balls = rack(DEFAULT_SETTINGS, t);
      this.shots = 0;
    }
    const cue = this.balls[0];
    let params: ShotParams;
    if (this.shots === 0) {
      // Break off: thin the outside red with side.
      const target = { x: t.spots.pink.x + 2 * t.R + 60, y: t.dCenter.y + 52 + Math.random() * 30 };
      params = { ...dir(cue, target), power: 0.85 + Math.random() * 0.12, spinX: 0.4, spinY: -0.1 };
    } else {
      params = this.findPot(cue) ?? { ...dir(cue, this.balls.find((b) => b.on && b.id !== 0)!), power: 0.5, spinX: 0, spinY: 0 };
    }
    this.shots++;
    this.cue = { dx: params.dx, dy: params.dy, t0: now, params, start: { x: cue.x, y: cue.y } };
  }

  /** Look for a straight pot with a clear path; good enough to look like someone is playing. */
  private findPot(cue: Ball): ShotParams | null {
    const t = this.table;
    const R = t.R;
    let best: { score: number; p: ShotParams } | null = null;
    for (const ob of this.balls) {
      if (!ob.on || ob.id === 0) continue;
      for (const pk of t.pockets) {
        const px = pk.mx - pk.nx * R * 0.4, py = pk.my - pk.ny * R * 0.4;
        const ex = px - ob.x, ey = py - ob.y;
        const el = Math.hypot(ex, ey);
        const gx = ob.x - (ex / el) * 2 * R, gy = ob.y - (ey / el) * 2 * R;
        const cx = gx - cue.x, cy = gy - cue.y;
        const cl = Math.hypot(cx, cy);
        const cut = (cx * ex + cy * ey) / (cl * el);
        if (cut < 0.45 || cl < 3 * R) continue;
        if (!this.clear(cue.x, cue.y, gx, gy, [0, ob.id]) || !this.clear(ob.x, ob.y, px, py, [0, ob.id])) continue;
        const score = cut * 2 - (cl + el) / 4000 + Math.random() * 0.2;
        if (!best || score > best.score) {
          const power = Math.min(0.75, 0.22 + (cl + el / Math.max(cut, 0.5)) / 6500);
          best = { score, p: { dx: cx / cl, dy: cy / cl, power, spinX: 0, spinY: Math.random() * 0.6 - 0.4 } };
        }
      }
    }
    return best?.p ?? null;
  }

  private clear(x0: number, y0: number, x1: number, y1: number, ignore: number[]) {
    const R = this.table.R;
    const ex = x1 - x0, ey = y1 - y0;
    const l2 = ex * ex + ey * ey;
    for (const b of this.balls) {
      if (!b.on || ignore.includes(b.id)) continue;
      let k = ((b.x - x0) * ex + (b.y - y0) * ey) / l2;
      k = Math.max(0, Math.min(1, k));
      if (Math.hypot(b.x - (x0 + ex * k), b.y - (y0 + ey * k)) < 2 * R + 2) return false;
    }
    return true;
  }
}

function dir(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  return { dx: dx / l, dy: dy / l };
}

// ---------------------------------------------------------------------------------------------

export function renderHome(root: HTMLElement, actions: HomeActions, notice?: string): () => void {
  const el = h('main.home');
  const canvas = h('canvas.attract', { 'aria-hidden': 'true' }) as HTMLCanvasElement;
  el.append(canvas);

  const p = prefs();
  const nameInput = h('input.input', {
    id: 'name', placeholder: 'What should we call you?', maxlength: 20, value: p.profile.name, autocomplete: 'nickname',
    oninput: () => savePrefs({ profile: { ...prefs().profile, name: nameInput.value } }),
  }) as HTMLInputElement;
  const avatarBtn = h('button.you-avatar', { type: 'button', 'aria-label': 'Change your picture', onclick: () => { locker.open = true; } }, p.profile.avatar);

  const codeInput = h('input.input', { placeholder: 'Table code', maxlength: 8, 'aria-label': 'Table code', autocapitalize: 'characters', style: 'text-transform: uppercase; letter-spacing: .08em' }) as HTMLInputElement;
  const joinForm = h('form.row', {
    onsubmit: (e: Event) => {
      e.preventDefault();
      const code = normalizeCode(codeInput.value);
      if (code.length === 6) actions.join(code);
      else codeInput.focus();
    },
  }, codeInput, h('button.btn', { type: 'submit' }, 'Join'));

  const avatarGrid = h('div.avatar-grid', { role: 'group', 'aria-label': 'Your picture' });
  const paintAvatars = () => {
    avatarGrid.innerHTML = '';
    for (const a of AVATARS) {
      avatarGrid.append(h('button', {
        type: 'button', 'aria-label': a, 'aria-pressed': String(prefs().profile.avatar === a),
        onclick: () => { savePrefs({ profile: { ...prefs().profile, avatar: a } }); avatarBtn.textContent = a; paintAvatars(); },
      }, a));
    }
  };
  paintAvatars();
  const cueSlot = h('div');
  const paintCues = () => {
    cueSlot.innerHTML = '';
    cueSlot.append(cuePicker(prefs().profile.cue, (id) => { savePrefs({ profile: { ...prefs().profile, cue: id } }); paintCues(); }));
  };
  paintCues();
  const labels = h('label.toggle', {},
    h('input', { type: 'checkbox', checked: p.ballLabels, onchange: (e: Event) => savePrefs({ ballLabels: (e.target as HTMLInputElement).checked }) }),
    h('span', {}, h('b', {}, 'Numbers on balls'), h('small', {}, 'Prints each ball’s value on it. Handy if colours are hard to tell apart.')),
  );
  const locker = h('details.details', {},
    h('summary', {}, 'Your locker: picture, cue and display'),
    h('div.locker', {}, avatarGrid, cueSlot, labels),
  ) as HTMLDetailsElement;

  const second = () => {
    const card = h('div.scrim', {});
    const n2 = h('input.input', { placeholder: 'Their name', maxlength: 20, value: 'Player 2' }) as HTMLInputElement;
    card.append(h('form.card.panel', {
      onsubmit: (e: Event) => {
        e.preventDefault();
        card.remove();
        const avatar = AVATARS.filter((a) => a !== prefs().profile.avatar)[Math.floor(Math.random() * (AVATARS.length - 1))];
        actions.passAndPlay({ name: n2.value.trim() || 'Player 2', avatar });
      },
    },
    h('h2', {}, 'Who are you playing?'),
    h('p', {}, 'You share this screen and take turns at the table.'),
    h('label.field', {}, h('span', {}, 'Opponent'), n2),
    h('div.actions', {}, h('button.btn.btn-brass', { type: 'submit' }, 'Rack them up'), h('button.btn', { type: 'button', onclick: () => card.remove() }, 'Cancel')),
    ));
    el.append(card);
    n2.select();
  };

  const card = h('section.home-card.panel', {},
    h('h1.wordmark', {}, 'Baize Club', h('span.ball-dot', { 'aria-hidden': 'true' })),
    h('p.lede', {}, 'Open a private snooker table, send a friend the link, and play. No sign-up, nothing to install.'),
    notice ? h('p', { role: 'alert', style: 'margin:0; color:#ffcbc2' }, notice) : null,
    h('div.you-row', {}, avatarBtn, h('label.field', { for: 'name' }, h('span', {}, 'Your name'), nameInput)),
    h('div.home-actions', {},
      h('button.btn.btn-brass', { type: 'button', onclick: () => { unlockAudio(); actions.host(); } }, 'Open a private table'),
      joinForm,
      h('div.split', {},
        h('button.btn', { type: 'button', onclick: () => { unlockAudio(); actions.practice(); } }, 'Practice alone'),
        h('button.btn', { type: 'button', onclick: () => { unlockAudio(); second(); } }, 'Pass and play'),
      ),
    ),
    locker,
    h('footer.home-foot', {},
      h('span', {}, 'Made by ', h('a', { href: 'https://github.com/AtharvaLakhe', target: '_blank', rel: 'noopener' }, 'Atharva Lakhe')),
      h('a.gh-star', { href: REPO_URL, target: '_blank', rel: 'noopener' }, '★ Star on GitHub'),
    ),
  );
  el.append(card);
  root.append(el);

  const attract = new Attract(canvas, () => {
    const wide = window.innerWidth > 900;
    return wide ? { top: 40, right: 40, bottom: 40, left: Math.min(520, window.innerWidth * 0.4) } : { top: 20, right: 10, bottom: 20, left: 10 };
  });
  attract.start();
  if (!p.profile.name) setTimeout(() => nameInput.focus(), 50);

  return () => {
    attract.stop();
    el.remove();
  };
}
