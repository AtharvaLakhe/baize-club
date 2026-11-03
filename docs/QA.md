# Redesign and reliability verification — 2026-11-03

## Changes covered

- Rebuilt club entrance, integrated mode/game selection, animated feedback, controllable live preview, tabbed lobby, room header, scoreboard, controls dock, dialogs, and responsive styling.
- Pool: the first legal pot assigns groups, including a legal break pot. Later solids stay with the player assigned solids; a scratched break does not assign groups. Regressions cover either breaker. Group names remain visible beside remaining-ball indicators.
- Pass-and-play rematches, duplicate start protection, stale computer-turn cleanup, session teardown, cancelled connections, broker timeout, premature channel close, and reserved host identity protection.
- Corrupt saved preferences/settings, non-finite cue placement, and invalid spin input.
- Table geometry cache changes, shot-clock accounting across playback, stale replays, graphics cleanup, dialog focus, and short landscape lobby layout.
- Snooker opening search: four evaluated thin-contact breaks replace 180 near-identical safety evaluations. Candidate geometry tests disable the intended difficulty wobble to stay deterministic.

## Automated checks

`npm test`: 61 tests across nine files. `npm run build`: TypeScript and production Vite build. `npm run test:e2e`: 14 Chromium browser tests. Browser functional tests use reduced motion to make control assertions stable; normal preview animation was also exercised through the Playwright plugin.

Browser coverage includes selection/focus retention, profile focus containment, invalid invite feedback, connection cancellation, one-device rematches, both practice games, reduced motion, repeated GPU table rebuilds, actual shot-playback clock accounting, missing WebGL, four home widths (375/768/1024/1440), and two short landscape lobby sizes (844×390 and 667×375).

Functional browser tests render the actual WebGL scene at half pixel density, with unchanged CSS viewport sizes and physics. This keeps input and playback checks responsive on CPU-only CI runners. The plugin-based visual checks used normal rendering density. The first hosted CI run timed out on two full-resolution playback tests; the test fixture was adjusted to bound graphics work rather than extending the tests' timeouts.

## Manual browser checks

Used the Playwright plugin with separate browser contexts for host and guest. Verified public PeerJS registration, invite joining, shared lobby, game start, chat delivery, matching shot outcomes/scores, and guest disconnection feedback after the host leaves. This checks two isolated browser sessions on the same machine, rather than every possible network/NAT configuration.

Graphics measurements over five alternating snooker/pool rebuilds: allocated geometries previously grew 59 → 76 → 97 → 114 → 135. After cleanup they remain 51 → 46 → 51 → 46 → 51; textures stabilize after both game sets load.

Refreshed repository screenshots and social preview. Reviewed phone portrait, phone landscape, desktop, profile, lobby, and match presentation. Independent source review findings (modal focus, stale replay, paused-preview refresh, stochastic test input, short lobby) were resolved before committing.
