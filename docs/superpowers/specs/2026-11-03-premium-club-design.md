# Premium club redesign and reliability

The user requested a complete UI redesign, bug fixes, and a commit pushed to the existing GitHub repository. Their selected direction is a dark, premium club. Keep the Obsidian name, existing TypeScript/Vite/Three.js stack, both games, and all four play modes.

## Visual direction

Use charcoal #111312, raised graphite #1b1e1b, ivory #eee9dc, muted sage #a5afa3, brass #c6a66b, and cloth green #285b42. Use Cormorant Garamond for large club-style headings and Manrope for controls. The identity comes from a large typographic invitation paired with the actual live table, a discreet club crest, and a contained match setup console. Avoid a long generic marketing page: put game choice, play mode, difficulty, and the primary action together. Include a separate join form, concise controls guidance, and a quiet footer. On mobile, stack the preview and setup without clipping or requiring horizontal scrolling.

Apply the same tokens to the lobby, profile, match scoreboard, menus, and end cards. Preserve useful table space. Make dialogs keyboard accessible and prevent gameplay shortcuts while a dialog is open. If WebGL is unavailable, the home controls must remain usable with a static preview and games must show an actionable error.

## Reliability

User clarification: in pool, pocketing solids at the start must establish solids for that player, with subsequent solids credited to the same side. Apply the first legal pot assignment to break shots; a scratched break leaves groups open. Keep group labels visible in the scoreboard.

User refinement: explicitly use UI UX Pro Max and rebuild the interface with interactive, animated behavior. Use its verified style/typography/interaction guidance, retain the selected dark premium direction, and implement reduced-motion alternatives.

Fix evidenced failures rather than claiming to remove every possible bug. Cover pass-and-play rematches, session cleanup and stale async navigation, table geometry changes, shot-clock time during playback, invalid persisted preferences, and malformed network input. Preserve house rules and existing physics. Add regressions for functional changes; browser-test the redesigned home, both games, offline modes, profile, and mobile layouts. Online play requires the external PeerJS service and an available WebRTC path; record any inability to verify this.

## Delivery

Run the full test suite and production build, review the diff, commit on the working branch, then fast-forward the existing remote main branch if unchanged. Do not overwrite intervening remote changes or create unrelated hosting resources. Refresh repository screenshots and README to reflect the shipped interface.
