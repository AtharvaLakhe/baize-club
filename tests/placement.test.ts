import { describe, expect, it } from 'vitest';
import { canPlaceCue, DEFAULT_SETTINGS, newMatch, tableFor } from '../src/core/rules';

describe('cue ball placement', () => {
  const settings = { ...DEFAULT_SETTINGS, game: 'pool8' as const };
  const table = tableFor(settings);
  const balls = newMatch(settings, 0).frame.balls;
  it.each([NaN, Infinity, -Infinity])('rejects invalid x coordinate %s', (x) => {
    expect(canPlaceCue(table, balls, x, table.W / 2, 'table')).toBe(false);
  });
  it.each([NaN, Infinity, -Infinity])('rejects invalid y coordinate %s', (y) => {
    expect(canPlaceCue(table, balls, table.baulkX, y, 'table')).toBe(false);
  });
});
