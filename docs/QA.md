# Interactive-eight design and reliability verification — 2026-11-03

## Changes covered

- Replaced the paper match board with a dark interactive playroom. The eight-ball follows horizontal dragging and rolls away on release, click, tap, Enter, or Space; reset brings it back. Cancelled gestures restore the pose. Mode/game controls remain direct, and the live table pauses while covered. Reduced motion skips the rolling and pointer tilt. The lobby, scoreboard, dialogs, fonts, favicon, PWA colors, and screenshots share the new identity.
- Pool: the first legal pot assigns groups, including a legal break pot. Later solids stay with the player assigned solids; a scratched break does not assign groups. Regressions cover either breaker. Group names remain visible beside remaining-ball indicators.
- Pass-and-play rematches, duplicate start protection, stale computer-turn cleanup, session teardown, cancelled connections, broker timeout, premature channel close, and reserved host identity protection.
- Corrupt saved preferences/settings, non-finite cue placement, and invalid spin input.
- Table geometry cache changes, shot-clock accounting across playback, stale replays, graphics cleanup, dialog focus, and short landscape lobby layout.
- Snooker opening search: four evaluated thin-contact breaks replace 180 near-identical safety evaluations. Candidate geometry tests disable the intended difficulty wobble to stay deterministic.

## Automated checks

`npm test`: 61 tests across nine files. `npm run build`: TypeScript and production Vite build. `npm run test:e2e`: 17 Chromium browser cases, including three new cases for the eight-ball reveal/reset, drag, and pointer cancellation. The drag case explicitly enables normal motion and checks actual displacement; other functional tests generally use reduced motion for stable control assertions. Normal pointer motion and rolling were also exercised through the Playwright plugin and captured on video.

Browser coverage includes selection/focus retention, profile focus containment, invalid invite feedback, connection cancellation, one-device rematches, both practice games, reduced motion, repeated GPU table rebuilds, actual shot-playback clock accounting, missing WebGL, four home widths (375/768/1024/1440), and two short landscape lobby sizes (844×390 and 667×375).

Functional browser tests render the actual WebGL scene at half pixel density, with unchanged CSS viewport sizes and physics. The plugin-based visual checks used normal rendering density. Hosted CI exposed software-rendering delays: the clock test now uses a shorter real shot with the same 200ms deadline assertion. The rematch and two-game practice integration cases have a 60-second total budget for scene initialization and real input round trips; the other cases retain the 30-second budget.

## Manual browser checks

Used the Playwright plugin with separate browser contexts for host and guest. Verified public PeerJS registration, invite joining, shared lobby, game start, chat delivery, matching shot outcomes/scores, and guest disconnection feedback after the host leaves. This checks two isolated browser sessions on the same machine, rather than every possible network/NAT configuration.

Graphics measurements over five alternating snooker/pool rebuilds: allocated geometries previously grew 59 → 76 → 97 → 114 → 135. After cleanup they remain 51 → 46 → 51 → 46 → 51; textures stabilize after both game sets load.

Refreshed repository screenshots and social preview. Reviewed phone portrait, phone landscape, desktop, profile, lobby, and match presentation. The latest interactive pass additionally verified real mobile touch reveal/reset with no page errors, font loading, normal drag displacement/rotation, and a recorded reveal/return. Independent review found a stale release pose after drag → reset → game selection; reset now clears it and browser coverage checks that sequence. Earlier review findings (modal focus, stale replay, paused-preview refresh, stochastic test input, short lobby) remain resolved.
