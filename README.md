<div align="center">

<a href="https://baize-club.vercel.app"><img src="public/og.png" alt="Baize Club: a 3D snooker table seen from behind the cue ball" width="100%"></a>

# Baize Club

**Private online snooker for you and your friends.**
Open a table, send the link, play. No accounts, no downloads, no lobbies full of strangers.

[![Play now](https://img.shields.io/badge/Play%20now-baize--club.vercel.app-d4b06a?style=for-the-badge&labelColor=1d1510)](https://baize-club.vercel.app)
[![Stars](https://img.shields.io/github/stars/AtharvaLakhe/baize-club?style=for-the-badge&color=d4b06a&labelColor=1d1510)](https://github.com/AtharvaLakhe/baize-club/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/AtharvaLakhe/baize-club/ci.yml?style=for-the-badge&labelColor=1d1510&label=tests)](https://github.com/AtharvaLakhe/baize-club/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-d4b06a?style=for-the-badge&labelColor=1d1510)](LICENSE)

</div>

---

## Why

Every online snooker game wants you to sign up, grind levels and play strangers. Sometimes you just want to play your mate across town. Baize Club is a private table you can open in a couple of seconds: the link *is* the invite.

## What's in it

**Proper snooker**
- Full rules: reds and colours, fouls valued correctly, colours respotted to the right spot (or the highest free one), free ball when you're snookered after a foul, *put him back in*, and a re-spotted black on a tie.
- 15, 10, 6 or 3 reds, single frames or best of 3, 5 or 7.
- **Singles (1 v 1) or doubles (2 v 2)** with real doubles rotation: A1, B1, A2, B2.

**It feels like a shot**
- Spin-aware physics: the cue ball slides, then rolls. Screw back, follow through, stun, and side that bends off the cushions.
- Real 3D table built from the same geometry the physics uses, with lamp-lit clear-coated balls and a broadcast cue ball whose red spots show the spin.
- A cue that winds back, drives through and follows through. Chalk dust, impact flashes, hit-stop on big contacts, camera shake on a full-power break.
- Layered synthesized audio (no sound files): the tip's *thock*, resin clacks, cushion thumps, the pocket drop, a rolling rumble and a little room reverb.
- Two cameras: **player view** behind the cue, or **overhead** for planning. Press `C` to switch.

**Yours**
- Seven cloths (championship green, tournament blue, claret, plum, slate, saffron, midnight neon) and seven cues.
- House rules: shot clock, aiming guide (full paths, ghost ball, line, or none) and party rules: **bucket pockets**, **ice cloth**, **rubber cushions** and **marbles**.
- Numbers on the balls for anyone who finds the colours hard to tell apart.

**With friends**
- Invite by link, code or QR. Extra people who join watch.
- Your opponent's cue moves live as they line up.
- Chat, emoji reactions, instant replay at half speed, and a result card you can share after the match.
- Practice alone, or pass-and-play on one device.

<p align="center">
  <img src="docs/media/home.png" width="49%" alt="Home screen over a slowly orbiting 3D table">
  <img src="docs/media/lobby.png" width="49%" alt="Lobby with invite link, QR code and house rules">
</p>
<p align="center">
  <img src="docs/media/player-view.png" width="74%" alt="Player view from behind the cue ball">
  <img src="docs/media/mobile.png" width="24%" alt="Phone layout">
</p>

## How it works

There is no game server. The browser that opens the table becomes the **host**; friends connect to it directly over WebRTC data channels. The public [PeerJS](https://peerjs.com) broker only introduces the browsers to each other.

```mermaid
flowchart LR
  subgraph Host browser
    UI1[Table UI] -- loopback --> H[HostRoom<br/>rules + physics]
  end
  B[(PeerJS broker)] -. introduces .-> H
  F1[Friend] <-- WebRTC --> H
  F2[Friend] <-- WebRTC --> H
  S[Spectator] <-- WebRTC --> H
```

1. The player at the table sends only the shot: aim, power and tip position.
2. The host runs the physics to completion, scores it with the rules engine, and broadcasts the shot plus the resulting state.
3. Every screen replays the shot in real time with the same physics. The step uses only `+ − × ÷` and `sqrt`, so it lands in the same place in every browser; the host's state is applied at the end regardless.

The physics models each ball's velocity and the velocity of its contact patch. While they disagree the ball slides and cloth friction pulls them together; when they cancel it rolls. That's what makes screw, follow and stun come out naturally rather than being faked.

If the host reloads, the table reopens on the same code and friends can rejoin with the link they already have.

## Controls

| | Desktop | Phone |
|---|---|---|
| Aim | Move the mouse (hold `Shift` for fine aim), or arrow keys | Drag on the table |
| Power and shoot | Click and drag back, let go. Or drag the power bar | Drag the power bar, let go |
| Spin | Click the cue ball in the dock (`W A S D` when focused) | Tap the cue ball in the dock |
| Camera | `C` | Camera button |
| Ball in hand | Drag the cue ball inside the D | Same |

## Run it locally

```bash
git clone https://github.com/AtharvaLakhe/baize-club.git
cd baize-club
npm install
npm run dev      # http://localhost:5173
npm test         # physics and rules tests
npm run build
```

Open two tabs to play yourself online.

## Project layout

```
src/
  core/      table geometry, physics, rules, aim prediction: pure and tested
  net/       protocol, host authority, PeerJS transport, client session
  game/      real-time shot playback and ball orientation
  render/    three.js table, balls, cue, effects, themes
  audio/     synthesized sound
  ui/        home, lobby, game screen, share card
tests/       vitest suites for physics and rules
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contributing

Ideas, bug reports and pull requests are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Things that would be lovely:

- A computer opponent for practice
- Pool (8-ball and 9-ball) on the same engine
- Swerve and masse
- A trick-shot editor with shareable layouts
- More cloths and cues

## Credits

Made by **[Atharva Lakhe](https://github.com/AtharvaLakhe)**.

If Baize Club made you smile, a ⭐ helps other people find it.

## License

[MIT](LICENSE)
