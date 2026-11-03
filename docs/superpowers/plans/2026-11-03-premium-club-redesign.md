# Premium Club Implementation Plan

> Implement inline with superpowers:executing-plans, followed by a fresh whole-change review.

**Goal:** Redesign Obsidian as a premium dark club and repair reproducible reliability bugs.
**Architecture:** Preserve the pure game engines and host-authoritative sessions. Validate data at network/storage boundaries, clean up sessions at route boundaries, and replace the home layout and shared design tokens.
**Tech stack:** TypeScript, Vite, Three.js, PeerJS, Vitest; Playwright plugin for browser QA.
**Spec:** ../specs/2026-11-03-premium-club-design.md

## Constraints and review focus

Keep both games and all play modes. No new hosting service. Maintain mobile and keyboard access. Check interrupted navigation, corrupted storage, canceled dialogs, stale bot timers, and invalid network coordinates.

## Tasks

- [x] 1. Add failing host/placement/preference regressions; verify failures. Repair local rematches, unintended restarts, bot lifecycle, and boundary validation. Run full tests.
- [x] 2. Repair navigation/session teardown and stale async completions in main.ts and session.ts. Include cancellation in the connecting screen. Verify session cleanup with tests and browser navigation.
- [x] 3. Replace home.ts presentation with the live table + integrated setup console; rewrite landing CSS and shared tokens, refresh lobby and HUD. Fix geometry cache keys and playback clock accounting. Verify both games and all offline modes in Playwright.
- [x] 4. Make profile/how-to/pass-and-play dialogs accessible and cancellable. Check keyboard and mobile behavior, reduced motion, WebGL failure.
- [x] 5. Update screenshots/docs, run full tests and build, obtain independent review, fix material findings, commit and push with no force.

## Evidence ledger

- Baseline: 33 tests pass; production build passes; npm audit reports zero vulnerabilities.
- Fresh isolated clone on fix/premium-club-redesign; original checkout untouched.
- User selected dark premium club; implementation and push already authorized.

- Final evidence: 61 unit tests, 14 browser regressions, production build, and diff check. See docs/QA.md for manual online and graphics checks.
- Review findings resolved: modal focus retention, stale replays, paused preview refresh, deterministic AI test inputs, compact landscape lobby.
