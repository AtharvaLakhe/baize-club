import { DEFAULT_SETTINGS, type MatchSettings } from './rules';
import { TABLE_THEMES } from '../render/themes';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Storage and WebRTC messages are runtime data, not trustworthy TypeScript objects. */
export function normalizeSettings(value: unknown, fallback: MatchSettings = DEFAULT_SETTINGS): MatchSettings {
  const s = isRecord(value) ? value : {};
  const pick = <T>(v: unknown, allowed: readonly T[], otherwise: T): T => allowed.includes(v as T) ? v as T : otherwise;
  const flag = (v: unknown, otherwise: boolean) => typeof v === 'boolean' ? v : otherwise;
  const mutators = isRecord(s.mutators) ? s.mutators : {};
  return {
    game: pick(s.game, ['snooker', 'pool8'] as const, fallback.game),
    mode: pick(s.mode, ['match', 'practice'] as const, fallback.mode),
    teamSize: pick(s.teamSize, [1, 2], fallback.teamSize),
    reds: pick(s.reds, [3, 6, 10, 15], fallback.reds),
    bestOf: pick(s.bestOf, [1, 3, 5, 7], fallback.bestOf),
    shotClock: pick(s.shotClock, [0, 20, 30, 60], fallback.shotClock),
    aimGuide: pick(s.aimGuide, ['full', 'ghost', 'line', 'off'] as const, fallback.aimGuide),
    freeBall: flag(s.freeBall, fallback.freeBall),
    playAgain: flag(s.playAgain, fallback.playAgain),
    tableTheme: pick(s.tableTheme, TABLE_THEMES.map((t) => t.id), fallback.tableTheme),
    mutators: {
      bigPockets: flag(mutators.bigPockets, fallback.mutators.bigPockets),
      iceCloth: flag(mutators.iceCloth, fallback.mutators.iceCloth),
      rubberCushions: flag(mutators.rubberCushions, fallback.mutators.rubberCushions),
      miniBalls: flag(mutators.miniBalls, fallback.mutators.miniBalls),
    },
  };
}
