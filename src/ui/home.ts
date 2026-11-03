// The front door: a landing page over a live 3D table where a ghost player knocks balls in.

import { DEFAULT_SETTINGS, rack, type MatchSettings } from '../core/rules';
import { buildTable, DEFAULT_TUNING, type Game } from '../core/table';
import type { Ball, ShotParams } from '../core/physics';
import type { BotLevel } from '../core/ai';
import { Orientations, ShotAnimator } from '../game/animator';
import { Renderer3D } from '../render/renderer3d';
import { prefs } from '../prefs';
import { defaultCloth } from './lobby';

export interface HomeActions {
  host(): void;
  join(code: string): void;
  practice(): void;
  bot(level: BotLevel): void;
  passAndPlay(second: { name: string; avatar: string }): void;
}

export class Attract {
  private renderer: Renderer3D;
  private settings: MatchSettings = { ...DEFAULT_SETTINGS, game: (prefs().lastSettings.game ?? 'snooker') as Game };
  private table = buildTable(DEFAULT_TUNING, this.settings.game);
  private balls: Ball[] = rack(this.settings, this.table);
  private anim: ShotAnimator | null = null;
  private waitUntil = 0;
  private shots = 0;
  private raf = 0;
  private last = 0;
  private orients = new Orientations();
  private cue: { dx: number; dy: number; t0: number; params: ShotParams; start: { x: number; y: number } } | null = null;
  private cueGone: { dx: number; dy: number; t0: number; params: ShotParams; start: { x: number; y: number } } | null = null;

  constructor(readonly canvas: HTMLCanvasElement, private padding: () => { top: number; right: number; bottom: number; left: number }) {
    this.renderer = new Renderer3D(canvas, this.table, defaultCloth(this.settings.game, 'championship'));
    this.renderer.setMode('orbit');
    this.renderer.setPadding(padding());
    this.waitUntil = performance.now() + 900;
  }

  start() {
    cancelAnimationFrame(this.raf);
    this.renderer.setMode('orbit');
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

  paused = false;

  resize() { this.onResize(); if (this.paused) this.drawStill(); }

  still() {
    this.renderer.setMode('overview');
    this.drawStill();
  }

  private drawStill() {
    this.renderer.draw({ balls: this.balls, pots: [], now: performance.now(), cue: null, guide: null, placing: null, labels: false, orient: (id) => this.orients.get(id), moving: false });
  }

  /** Switch the demo table between snooker and pool. */
  setGame(game: Game) {
    this.settings = { ...DEFAULT_SETTINGS, game };
    this.table = buildTable(DEFAULT_TUNING, game);
    this.balls = rack(this.settings, this.table);
    this.renderer.setTable(this.table, defaultCloth(game, 'championship'));
    this.anim = null;
    this.cue = null;
    this.cueGone = null;
    this.shots = 0;
    this.orients = new Orientations();
    this.waitUntil = performance.now() + 700;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.still();
    else if (this.paused) this.drawStill();
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.paused) return;
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
      this.balls = rack(this.settings, t);
      this.shots = 0;
    }
    const cue = this.balls[0];
    let params: ShotParams;
    if (this.shots === 0) {
      // Break off: thin the outside red with side.
      if (t.game === 'pool8') {
        // Pool: smash the apex.
        params = { ...dir(cue, { x: t.footSpot.x, y: t.footSpot.y + (Math.random() - 0.5) * 10 }), power: 0.95, spinX: 0, spinY: -0.2 };
      } else {
        const target = { x: t.spots.pink.x + 2 * t.R + 60, y: t.dCenter.y + 52 + Math.random() * 30 };
        params = { ...dir(cue, target), power: 0.85 + Math.random() * 0.12, spinX: 0.4, spinY: -0.1 };
      }
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
