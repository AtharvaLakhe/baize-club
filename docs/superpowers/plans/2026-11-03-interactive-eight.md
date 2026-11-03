# Interactive eight implementation plan

**Goal:** Replace the rejected match-board design with a distinctive, interactive billiards front door and carry its dark identity through the game.

**Architecture:** Preserve the existing home actions, invite validation, modal lifecycle, and game engine. Compose the home as one open stage, an oversized ball over a wide wordmark, and a compact play dock. A small pointer controller makes the ball respond to dragging; click and keyboard activation perform the same reveal. CSS handles the reveal and reduced-motion rendering. The existing live table is paused while covered.

**Tech stack:** TypeScript, CSS, existing Three.js table renderer, Playwright.

## Design decisions

- Midnight violet `#191921`, ink `#101015`, chalk `#eeede5`, muted chalk `#b5b4c2`, slate lavender `#c4c5e4`.
- Syne for the broad wordmark and headings; DM Sans for readable controls. Self-host Latin fonts with their licenses.
- One central spherical eight-ball, dimensional highlights, and a displaced number patch. Animation answers pointer input and table-reveal actions. No scrolling choreography, auto-rotating UI, or decorative counters.
- Game tabs reveal the real live table. A reset control restores the eight-ball composition. Game and mode actions retain their accessible names and keyboard focus.
- The mode dock and join form remain available independently of the ball. Mobile uses a compact stage and two-column mode choices. Lobby and game panels share the new dark colors.

## Work

- [x] Add browser coverage for click, keyboard reset, horizontal dragging, and reduced motion before implementation. Confirm the new controls fail before adding them.
- [x] Implement a self-contained ball input controller with pointer cancellation, visibility/reduced-motion handling, and cleanup.
- [x] Recompose the home, pause the covered table, and replace the paper theme with the dark playroom system.
- [x] Inspect the real site at desktop and mobile sizes; verify font loading, form errors, profile, lobby, and game room.
- [x] Run unit tests, build, complete browser suite, and whitespace checks. Review the diff and document the current design.
- [ ] Commit and push to main using existing authorization; verify CI and the deployed site.

## Review focus

Dragging cannot be the only way to reveal the table. Touch scrolling must remain usable. Pointer cancellation must restore the ball. Table animation must stop while covered, offscreen, or hidden. Reduced motion must immediately update states without rolling/parallax. Teardown must cancel pointer animation and remove listeners. Game switches must keep keyboard focus and existing rules unchanged.
