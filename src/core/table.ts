// Table geometry for a full-size snooker table. All units are millimetres.
// Origin is the top-left corner of the playing surface; the baulk end is on the left (x = 0).

export type BallKind = 'cue' | 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black';

export const COLOR_ORDER: BallKind[] = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

export const BALL_VALUE: Record<BallKind, number> = {
  cue: 0, red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7,
};

export const TABLE_LENGTH = 3569;
export const TABLE_WIDTH = 1778;
export const BASE_BALL_RADIUS = 26.25;
export const BAULK_X = 737;
export const D_RADIUS = 292;

/** Physical knobs that "mutators" in the lobby can change. */
export interface TableTuning {
  /** Multiplies pocket mouth width. 1 = regulation. */
  pocketScale: number;
  /** Multiplies ball radius. 1 = regulation. */
  ballScale: number;
  /** Multiplies cloth friction. Lower = faster ("ice") cloth. */
  friction: number;
  /** Cushion coefficient of restitution. */
  cushionBounce: number;
}

export const DEFAULT_TUNING: TableTuning = { pocketScale: 1, ballScale: 1, friction: 1, cushionBounce: 0.78 };

export interface Segment { ax: number; ay: number; bx: number; by: number }

export interface Pocket {
  /** Middle of the pocket mouth (between the two jaw noses). */
  mx: number; my: number;
  /** Unit vector pointing out of the table through the mouth. */
  nx: number; ny: number;
  /** Half-width of the mouth. */
  half: number;
  /** A ball whose centre passes this far beyond the mouth line drops. */
  drop: number;
  /** Where the hole is drawn. */
  hx: number; hy: number; hr: number;
}

export interface TableGeometry {
  L: number; W: number; R: number;
  segments: Segment[];
  pockets: Pocket[];
  spots: Record<Exclude<BallKind, 'cue' | 'red'>, { x: number; y: number }>;
  dCenter: { x: number; y: number };
  dRadius: number;
  baulkX: number;
  tuning: TableTuning;
}

export function buildTable(tuning: TableTuning = DEFAULT_TUNING): TableGeometry {
  const L = TABLE_LENGTH, W = TABLE_WIDTH;
  const R = BASE_BALL_RADIUS * tuning.ballScale;
  // Distance from the corner where each cushion ends. Mouth width = c * sqrt(2).
  const c = 64 * tuning.pocketScale;
  // Half the middle pocket mouth.
  const m = 48 * tuning.pocketScale;
  const jaw = 2.6 * BASE_BALL_RADIUS;
  const s2 = Math.SQRT1_2;

  const segments: Segment[] = [];
  const seg = (ax: number, ay: number, bx: number, by: number) => segments.push({ ax, ay, bx, by });

  // Long cushions (top and bottom), split by the middle pockets.
  seg(c, 0, L / 2 - m, 0);
  seg(L / 2 + m, 0, L - c, 0);
  seg(c, W, L / 2 - m, W);
  seg(L / 2 + m, W, L - c, W);
  // Short cushions.
  seg(0, c, 0, W - c);
  seg(L, c, L, W - c);

  // Corner jaws run parallel to the pocket's diagonal, out of the table.
  const corners: Array<[number, number, number, number]> = [
    [0, 0, -1, -1], [L, 0, 1, -1], [0, W, -1, 1], [L, W, 1, 1],
  ];
  const pockets: Pocket[] = [];
  for (const [cx, cy, sx, sy] of corners) {
    const ax = cx - sx * c, ay = cy; // end of long cushion
    const bx = cx, by = cy - sy * c; // end of short cushion
    const ox = sx * s2, oy = sy * s2;
    seg(ax, ay, ax + ox * jaw, ay + oy * jaw);
    seg(bx, by, bx + ox * jaw, by + oy * jaw);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    // The hole is a circle just outside the corner that passes through both jaw noses.
    const hx = cx + sx * 7, hy = cy + sy * 7;
    pockets.push({
      mx, my, nx: ox, ny: oy, half: (c * Math.SQRT2) / 2, drop: R * 0.55,
      hx, hy, hr: Math.sqrt((ax - hx) * (ax - hx) + (ay - hy) * (ay - hy)),
    });
  }
  // Middle pocket jaws flare slightly outwards.
  for (const [y, sy] of [[0, -1], [W, 1]] as const) {
    const flare = 0.22;
    const n = Math.sqrt(flare * flare + 1);
    seg(L / 2 - m, y, L / 2 - m - (flare / n) * jaw, y + (sy / n) * jaw);
    seg(L / 2 + m, y, L / 2 + m + (flare / n) * jaw, y + (sy / n) * jaw);
    pockets.push({
      mx: L / 2, my: y, nx: 0, ny: sy, half: m, drop: R * 0.7,
      hx: L / 2, hy: y + sy * 29, hr: Math.sqrt(m * m + 29 * 29),
    });
  }

  const cy = W / 2;
  return {
    L, W, R, segments, pockets, tuning,
    baulkX: BAULK_X,
    dCenter: { x: BAULK_X, y: cy },
    dRadius: D_RADIUS,
    spots: {
      // Seen from the baulk end looking up the table, yellow is on the left (top of the screen).
      yellow: { x: BAULK_X, y: cy - D_RADIUS },
      green: { x: BAULK_X, y: cy + D_RADIUS },
      brown: { x: BAULK_X, y: cy },
      blue: { x: L / 2, y: cy },
      pink: { x: (L * 3) / 4, y: cy },
      black: { x: L - 324, y: cy },
    },
  };
}

/** True if (x, y) is a legal place for the cue ball when it is "in hand" in the D. */
export function inD(t: TableGeometry, x: number, y: number): boolean {
  if (x > t.baulkX) return false;
  const dx = x - t.dCenter.x, dy = y - t.dCenter.y;
  return dx * dx + dy * dy <= t.dRadius * t.dRadius && x >= t.R;
}

/** Clamp a point into the D. */
export function clampToD(t: TableGeometry, x: number, y: number): { x: number; y: number } {
  let px = Math.min(x, t.baulkX);
  let py = y;
  const dx = px - t.dCenter.x, dy = py - t.dCenter.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const max = t.dRadius - 0.5;
  if (d > max) {
    px = t.dCenter.x + (dx / d) * max;
    py = t.dCenter.y + (dy / d) * max;
  }
  return { x: Math.max(px, t.R + 0.5), y: py };
}
