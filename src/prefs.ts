// Per-browser preferences. Everything here is a convenience: the game works if storage is blocked.

import { AVATARS, CUE_SKINS } from './render/themes';
import { isRecord, normalizeSettings } from './core/settings';
import type { Profile } from './net/protocol';
import { DEFAULT_SETTINGS, type MatchSettings } from './core/rules';

export interface Prefs {
  profile: Profile;
  sound: number;
  ballLabels: boolean;
  leftHanded: boolean;
  seenHowTo: boolean;
  lastBot: string;
  lastSettings: MatchSettings;
}

const KEY = 'baize.prefs.v1';

function defaults(): Prefs {
  return {
    profile: {
      name: '',
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      cue: 'maple',
    },
    sound: 0.8,
    ballLabels: false,
    leftHanded: false,
    seenHowTo: false,
    lastBot: 'medium',
    lastSettings: DEFAULT_SETTINGS,
  };
}

let cache: Prefs | null = null;

export function prefs(): Prefs {
  if (cache) return cache;
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const p = isRecord(parsed) ? parsed : {};
      const profile = isRecord(p.profile) ? p.profile : {};
      cache = {
        profile: {
          name: typeof profile.name === 'string' ? profile.name.slice(0, 20) : d.profile.name,
          avatar: typeof profile.avatar === 'string' && AVATARS.includes(profile.avatar) ? profile.avatar : d.profile.avatar,
          cue: typeof profile.cue === 'string' && CUE_SKINS.some((c) => c.id === profile.cue) ? profile.cue : d.profile.cue,
        },
        sound: typeof p.sound === 'number' && Number.isFinite(p.sound) ? Math.max(0, Math.min(1, p.sound)) : d.sound,
        ballLabels: typeof p.ballLabels === 'boolean' ? p.ballLabels : d.ballLabels,
        leftHanded: typeof p.leftHanded === 'boolean' ? p.leftHanded : d.leftHanded,
        seenHowTo: typeof p.seenHowTo === 'boolean' ? p.seenHowTo : d.seenHowTo,
        lastBot: typeof p.lastBot === 'string' && ['easy', 'medium', 'hard'].includes(p.lastBot) ? p.lastBot : d.lastBot,
        lastSettings: normalizeSettings(p.lastSettings),
      };
      return cache;
    }
  } catch { /* storage blocked or corrupt */ }
  cache = d;
  return cache;
}

export function savePrefs(patch: Partial<Prefs>) {
  cache = { ...prefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage blocked */ }
}

export function displayName(): string {
  return prefs().profile.name.trim() || 'Guest';
}

export function profileForWire(): Profile {
  const p = prefs().profile;
  return { ...p, name: p.name.trim() || 'Guest' };
}
