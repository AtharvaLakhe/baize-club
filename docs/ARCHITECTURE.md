# Architecture

Baize Club is a static site. Everything, including the authoritative game logic, runs in the players' browsers.

## Layers

| Folder | Responsibility | Depends on |
|---|---|---|
| `src/core` | Table geometry, physics, rules, aim prediction. Pure TypeScript, no DOM. | nothing |
| `src/net` | Message protocol, the host's authority (`HostRoom`), PeerJS transport, the client `Session`. | `core` |
| `src/game` | Real-time playback of a shot (`ShotAnimator`) and visual ball rotation. | `core`, `audio` |
| `src/render` | three.js scene: table built from `core` geometry, balls, cue, guide, effects. | `core` |
| `src/audio` | WebAudio synthesis. | nothing |
| `src/ui` | Screens: home, lobby, game, cards. | everything above |

## The table

`core/table.ts` describes the table in millimetres, with the origin at the top-left of the playing surface and the baulk end on the left. Cushions and jaws are line segments; pockets are a mouth line plus a drop depth. The 3D renderer extrudes the very same segments into cushions and cuts the bed and rail around the pocket circles, so what you see is what the balls hit.

## Physics

`core/physics.ts` advances in fixed 2 ms steps. Each ball carries:

- `vx, vy`: linear velocity
- `sx, sy`: velocity of the contact patch due to rotation
- `side`: vertical-axis spin

Slip `u = v + s`. While `|u| > 0` sliding friction acts against `u`; it changes `v` by `a·dt` and `s` by `2.5·a·dt` (from the moment of inertia of a solid sphere), so slip vanishes at 3.5× the linear rate and the ball settles into rolling. Ball-to-ball impacts exchange only linear momentum along the line of centres, which leaves spin on the cue ball: that is where screw and follow come from. Side spin acts at cushions.

Determinism matters because every screen replays the shot locally. The step uses only basic arithmetic and `sqrt`, which IEEE 754 defines exactly.

## Rules

`core/rules.ts` turns a `ShotRecord` (first ball hit, balls potted) and the final positions into the next `MatchState`. It handles ball on, foul values, respotting, free ball detection (`isSnookered` checks both extreme edges of every ball on), the "put them back in" choice, the re-spotted black, frames and matches, and doubles rotation (`activeChair`).

## Networking

```
player ──shot──▶ host: simulate → resolveShot → broadcast {shot, start, result}
                                                       │
                     every client ◀───────────────────┘  replays, then applies `result`
```

- The host's own UI is just another client over a loopback link, so there is one code path.
- Room codes are six characters; the PeerJS id is `baizeclub-v1-<code>`.
- Client ids live in `sessionStorage`, so two tabs are two players and a reload keeps your chair.
- The host saves the room and match to `sessionStorage`; reloading reopens the same code.

## Rendering

`render/renderer3d.ts` owns the WebGL scene. A custom environment (a dark hall with three glowing lamp canopies) gives the balls their single soft highlight. Effects (chalk, flashes, trails, camera shake, FOV punch) are driven by impact events from `ShotAnimator`.
