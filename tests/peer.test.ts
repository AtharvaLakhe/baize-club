import { afterEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  class Events {
    handlers = new Map<string, Array<(...args: any[]) => void>>();
    on(event: string, callback: (...args: any[]) => void) { this.handlers.set(event, [...this.handlers.get(event) ?? [], callback]); }
    emit(event: string, ...args: any[]) { this.handlers.get(event)?.forEach((callback) => callback(...args)); }
  }
  class Connection extends Events {
    open = false;
    close() { this.emit('close'); }
  }
  const peers: Peer[] = [];
  class Peer extends Events {
    destroyed = false;
    connection = new Connection();
    constructor() { super(); peers.push(this); }
    destroy() { this.destroyed = true; }
    connect() { return this.connection; }
  }
  return { Peer, peers };
});
vi.mock('peerjs', () => ({ default: fake.Peer }));
import { hostOnline, joinOnline } from '../src/net/peer';

afterEach(() => { fake.peers.length = 0; vi.useRealTimers(); });

describe('connection lifecycle', () => {
  it('destroys a host registration that times out', async () => {
    vi.useFakeTimers();
    const promise = hostOnline('ABC234', () => {}, 100).catch(() => {});
    await vi.advanceTimersByTimeAsync(100);
    expect(fake.peers[0].destroyed).toBe(true);
    await promise;
  });
  it('cancels host registration immediately when navigation aborts', async () => {
    const controller = new AbortController();
    const promise = hostOnline('ABC234', () => {}, 1000, controller.signal).catch(() => {});
    controller.abort();
    expect(fake.peers[0].destroyed).toBe(true);
    await promise;
  });
  it('cancels a guest connection without waiting for the timeout', async () => {
    const controller = new AbortController();
    const promise = joinOnline('ABC234', 1000, controller.signal).catch(() => {});
    controller.abort();
    expect(fake.peers[0].destroyed).toBe(true);
    await promise;
  });
  it('rejects a guest connection that closes before opening', async () => {
    vi.useFakeTimers();
    const promise = joinOnline('ABC234').catch(() => {});
    fake.peers[0].emit('open');
    fake.peers[0].connection.emit('close');
    expect(fake.peers[0].destroyed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await promise;
  });
});
