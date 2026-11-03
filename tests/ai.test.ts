import { describe, expect, it, vi } from 'vitest';
import * as physics from '../src/core/physics';
import { planShot, potLines } from '../src/core/ai';
import { makeWorld, simulate } from '../src/core/physics';
import { canPlaceCue, DEFAULT_SETTINGS, newMatch, tableFor, type MatchState } from '../src/core/rules';

const settings = { ...DEFAULT_SETTINGS };
const table = tableFor(settings);

/** A frame with only the cue ball and one red, the red sitting near the top-right corner. */
function simplePot(): MatchState {
  const m = newMatch(settings, 0);
  m.frame.ballInHand = false;
  const balls = m.frame.balls;
  for (const b of balls) if (b.kind !== 'cue') b.on = false;
  const red = balls.find((b) => b.kind === 'red')!;
  red.on = true;
  red.x = table.L - 420; red.y = 420;
  balls[0].x = table.L - 1100; balls[0].y = 1000;
  return m;
}

describe('computer opponent', () => {
  it('finds the straight pot', () => {
    const m = simplePot();
    const c = m.frame.balls[0];
    const lines = potLines(table, m.frame.balls, c.x, c.y, (b) => b.kind === 'red');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].pocket.nx).toBeGreaterThan(0);
    expect(lines[0].pocket.ny).toBeLessThan(0);
  });

  it('pots an easy red on hard', async () => {
    let potted = 0;
    for (let i = 0; i < 5; i++) {
      const m = simplePot();
      const shot = await planShot(m, 'hard');
      const w = makeWorld(table, m.frame.balls);
      const rec = simulate(w, shot.params);
      if (rec.potted.some((id) => m.frame.balls[id].kind === 'red')) potted++;
    }
    expect(potted).toBeGreaterThanOrEqual(4);
  });

  it('places the cue ball legally in the D when breaking off', async () => {
    const m = newMatch(settings, 0);
    const shot = await planShot(m, 'medium');
    expect(shot.cueX).toBeDefined();
    expect(canPlaceCue(table, m.frame.balls, shot.cueX!, shot.cueY!)).toBe(true);
    expect(Number.isFinite(shot.params.dx) && Number.isFinite(shot.params.power)).toBe(true);
  });

  it('uses a bounded opening search and makes legal red contact', async () => {
    const simulations = vi.spyOn(physics, 'simulate');
    // Difficulty adds intentional human error after planning. Isolate candidate geometry:
    // a quarter turn makes the Gaussian aim/power noise zero.
    const randomness = vi.spyOn(Math, 'random').mockReturnValue(.25);
    try {
      const m = newMatch(settings, 0);
      const shot = await planShot(m, 'medium');
      expect(simulations.mock.calls.length).toBeLessThanOrEqual(8);
      const balls = m.frame.balls.map((b) => ({ ...b }));
      balls[0].x = shot.cueX!; balls[0].y = shot.cueY!;
      const world = makeWorld(table, balls);
      const result = simulate(world, shot.params);
      expect(result.firstHit).not.toBeNull();
      expect(m.frame.balls[result.firstHit!].kind).toBe('red');
    } finally { simulations.mockRestore(); randomness.mockRestore(); }
  }, 20000);
});
