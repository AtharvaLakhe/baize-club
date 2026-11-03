// WebRTC data channels via PeerJS. The public PeerJS broker only introduces the browsers;
// after that, game traffic flows directly between friends.

import Peer, { type DataConnection } from 'peerjs';
import { PEER_PREFIX } from './protocol';
import type { Link } from './transport';

function wrap(conn: DataConnection): Link {
  let closed = false;
  const link: Link = {
    send(msg) {
      if (!closed && conn.open) conn.send(msg);
    },
    close() {
      if (closed) return;
      closed = true;
      try { conn.close(); } catch { /* already gone */ }
      link.onClose();
    },
    onMessage: () => {},
    onClose: () => {},
  };
  conn.on('data', (d) => link.onMessage(d));
  conn.on('close', () => link.close());
  conn.on('error', () => link.close());
  // Data channels can linger after a network drop; watch the ICE state too.
  const pc = conn.peerConnection;
  if (pc) {
    pc.addEventListener('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') link.close();
    });
  }
  return link;
}

export interface OnlineHost {
  peer: Peer;
  close(): void;
}

/** Register the room code with the broker and accept friends as they arrive. */
export function hostOnline(code: string, onLink: (l: Link) => void, timeoutMs = 15000, signal?: AbortSignal): Promise<OnlineHost> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const peer = new Peer(PEER_PREFIX + code, { debug: 0 });
    let opened = false;
    let settled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      finish();
      peer.destroy();
      reject(error);
    };
    const abort = () => fail(new DOMException('Connection cancelled', 'AbortError'));
    const timer = setTimeout(() => fail(new Error('timeout')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    peer.on('open', () => {
      if (settled) return;
      settled = true;
      opened = true;
      finish();
      resolve({ peer, close: () => { clearTimeout(reconnectTimer); peer.destroy(); } });
    });
    peer.on('connection', (conn) => {
      conn.on('open', () => onLink(wrap(conn)));
    });
    peer.on('disconnected', () => {
      // Lost the broker; existing games keep going, but new friends can't join until we reconnect.
      if (!peer.destroyed && opened) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
      }
    });
    peer.on('error', (err: Error & { type?: string }) => {
      if (!opened) fail(err);
    });
    peer.on('close', () => { if (!opened) fail(new Error('closed')); });
  });
}

export interface OnlineClient {
  link: Link;
  close(): void;
}

export function joinOnline(code: string, timeoutMs = 15000, signal?: AbortSignal): Promise<OnlineClient> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const peer = new Peer({ debug: 0 });
    let done = false;
    const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const fail = (e: Error) => {
      if (done) return;
      done = true;
      finish();
      peer.destroy();
      reject(e);
    };
    const abort = () => fail(new DOMException('Connection cancelled', 'AbortError'));
    const timer = setTimeout(() => fail(new Error('timeout')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      conn.on('open', () => {
        if (done) return;
        done = true;
        finish();
        const link = wrap(conn);
        const origClose = link.close;
        link.close = () => { origClose(); if (!peer.destroyed) peer.destroy(); };
        resolve({ link, close: () => link.close() });
      });
      conn.on('close', () => fail(new Error('closed')));
      conn.on('error', (err: Error) => fail(err));
    });
    peer.on('error', (err: Error & { type?: string }) => {
      fail(err.type === 'peer-unavailable' ? new Error('not-found') : err);
    });
    peer.on('close', () => fail(new Error('closed')));
  });
}
