import { describe, expect, it, vi } from 'vitest';
import { Session } from '../src/net/session';
import { DEFAULT_SETTINGS, newMatch } from '../src/core/rules';
import type { Link } from '../src/net/transport';
import type { RoomState } from '../src/net/protocol';

function setup() {
  const cleanup = vi.fn();
  const link: Link = { send: vi.fn(), close: vi.fn(), onMessage: () => {}, onClose: () => {} };
  const session = new Session(link, null, cleanup);
  const room: RoomState = { code: 'ABC234', hostId: 'me', kind: 'local', members: [], seats: ['me', null, null, null], settings: { ...DEFAULT_SETTINGS }, status: 'playing', rematchVotes: [] };
  link.onMessage({ t: 'welcome', you: 'me', room, match: newMatch(room.settings, 0) });
  return { session, link, cleanup, room };
}

describe('session lifecycle', () => {
  it('only closes and cleans up once', () => {
    const { session, cleanup, link } = setup();
    session.leave(); session.leave();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(link.close).toHaveBeenCalledTimes(1);
  });
  it('clears the previous match when the host returns to the lobby', () => {
    const { session, link, room } = setup();
    link.onMessage({ t: 'room', room: { ...room, status: 'lobby' } });
    expect(session.match).toBeNull();
  });
  it('does not give a local player control of empty chairs', () => {
    const { session } = setup();
    expect(session.myChairs()).toEqual([0]);
  });
});
