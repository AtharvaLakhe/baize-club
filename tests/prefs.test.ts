import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function read(raw: unknown) {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(raw), setItem: () => {} });
  return (await import('../src/prefs')).prefs();
}

describe('persisted preferences', () => {
  it('recovers safely from invalid profile and control types', async () => {
    const p = await read({ profile: { name: 42, avatar: null, cue: false }, sound: 'loud', leftHanded: 'false', lastBot: 'impossible' });
    expect(p.profile.name).toBe('');
    expect(typeof p.profile.avatar).toBe('string');
    expect(p.profile.cue).toBe('maple');
    expect(p.sound).toBe(0.8);
    expect(p.leftHanded).toBe(false);
    expect(p.lastBot).toBe('medium');
  });

  it('repairs invalid match settings from older or corrupt storage', async () => {
    const p = await read({ lastSettings: { game: 'chess', reds: -2, bestOf: 0, teamSize: 9, mutators: null } });
    expect(p.lastSettings.game).toBe('snooker');
    expect(p.lastSettings.reds).toBe(15);
    expect(p.lastSettings.bestOf).toBe(1);
    expect(p.lastSettings.teamSize).toBe(1);
    expect(p.lastSettings.mutators.bigPockets).toBe(false);
  });

  it('retains valid saved customizations', async () => {
    const p = await read({ profile: { name: 'Alex', cue: 'ebony' }, sound: 0, leftHanded: true, lastBot: 'hard', lastSettings: { game: 'pool8', reds: 6 } });
    expect(p.profile.name).toBe('Alex');
    expect(p.profile.cue).toBe('ebony');
    expect(p.sound).toBe(0);
    expect(p.leftHanded).toBe(true);
    expect(p.lastSettings.game).toBe('pool8');
    expect(p.lastSettings.reds).toBe(6);
  });
});
