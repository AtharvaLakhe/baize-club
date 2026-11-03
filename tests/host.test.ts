import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostRoom } from '../src/net/host';
import { loopbackPair } from '../src/net/transport';
import { DEFAULT_SETTINGS, newMatch } from '../src/core/rules';
import type { ClientMsg, HostMsg } from '../src/net/protocol';

const profile = { name: 'Player', avatar: '🎱', cue: 'maple' };
const rooms: HostRoom[] = [];
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

async function setup(kind: 'local' | 'online' = 'local') {
  const host = new HostRoom('ABC234', 'host', kind, { ...DEFAULT_SETTINGS });
  rooms.push(host);
  if (kind === 'local') host.seatLocal(['host', 'local-2', null, null], profile);
  const [a, client] = loopbackPair();
  host.addLink(a, true);
  const messages: HostMsg[] = [];
  client.onMessage = (msg) => messages.push(msg as HostMsg);
  client.send({ t: 'hello', clientId: 'host', profile });
  await flush();
  const send = async (msg: ClientMsg) => { client.send(msg); await flush(); };
  return { host, client, messages, send };
}

afterEach(() => { rooms.splice(0).forEach((room) => room.destroy()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('host lifecycle', () => {
  it('starts a pass-and-play rematch with one device vote', async () => {
    const { host, send } = await setup();
    host.start();
    host.match!.over = true;
    host.match!.frame.over = true;
    await send({ t: 'rematch' });
    expect(host.match!.over).toBe(false);
    expect(host.room.rematchVotes).toEqual([]);
  });

  it('ignores a start message while a frame is in progress', async () => {
    const { host, send } = await setup();
    host.start();
    host.match!.frame.scores[0] = 42;
    await send({ t: 'start' });
    expect(host.match!.frame.scores[0]).toBe(42);
  });

  it('does not let one connection change its identity with another hello', async () => {
    const { host, send } = await setup('online');
    await send({ t: 'hello', clientId: 'someone-else', profile });
    expect(host.room.members.map((m) => m.id)).toEqual(['host']);
  });

  it('clears pending computer turns when returning to the lobby', async () => {
    vi.useFakeTimers();
    const { host, send } = await setup();
    host.addBot('easy');
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    host.start();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await send({ t: 'toLobby' });
    expect(host.match).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    vi.restoreAllMocks();
  });
});

describe('host input validation', () => {
  it('does not let a remote connection impersonate the room host', async () => {
    const { host } = await setup('online');
    const [server, attacker] = loopbackPair();
    host.addLink(server);
    attacker.send({ t: 'hello', clientId: 'host', profile });
    await flush();
    attacker.send({ t: 'settings', settings: { ...DEFAULT_SETTINGS, bestOf: 7 } });
    await flush();
    expect(host.room.settings.bestOf).toBe(1);
  });

  it('rejects non-finite ball-in-hand coordinates without poisoning the table', async () => {
    const { host, send } = await setup();
    host.room.settings.game = 'pool8';
    host.start();
    host.match = newMatch(host.room.settings, 0);
    host.match.frame.hand = 'table';
    // A real remote message can contain arbitrary runtime values, even if TS disallows them.
    await send({ t: 'shot', seq: 0, params: { dx: 1, dy: 0, power: 0.2, spinX: 0, spinY: 0 }, cueX: Number.NaN, cueY: 100 });
    expect(host.match.seq).toBe(0);
    expect(host.match.frame.balls.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y))).toBe(true);
  });

  it('rejects out-of-range spin', async () => {
    const { host, send } = await setup();
    host.start();
    host.match!.frame.ballInHand = false;
    await send({ t: 'shot', seq: 0, params: { dx: 1, dy: 0, power: 0.2, spinX: 100, spinY: 0 } });
    expect(host.match!.seq).toBe(0);
  });

  it('ignores malformed settings rather than replacing the usable room settings', async () => {
    const { host, send } = await setup('online');
    await send({ t: 'settings', settings: null } as unknown as ClientMsg);
    expect(host.room.settings).toEqual(DEFAULT_SETTINGS);
  });
});
