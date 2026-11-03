# References and decisions

The user requested a distinctive identity and rejected the glossy luxury and subsequent paper match-board treatments. The current composition uses an oversized interactive billiard ball, wide Syne lettering, midnight-violet surfaces, and chalk/lavender controls. Its defining interaction is authored for this project: drag or activate the eight to uncover the actual table. This replaces the earlier static design directions.

The Playwright plugin was used to inspect the real mouse drag, keyboard reveal/reset, touch activation, and resulting table view. The CSS ball introduces no second WebGL context. All game actions remain available independently of the toy. UI UX Pro Max supplied the guidance on drag alternatives and reduced motion.

The Latin font assets are self-hosted with their SIL Open Font License files. Upstream sources: [Syne](https://github.com/google/fonts/tree/main/ofl/syne) and [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans).

## Earlier reference studies

These studies informed earlier iterations and general usability decisions; they are retained as research history, rather than as a template for the current visual composition:

| Reference | Useful idea | Applied here |
|---|---|---|
| [Lichess](https://lichess.org/) | Direct game selection and access to friend/computer play | The entrance begins with a game and its setup |
| [itch.io](https://itch.io/) | Plain navigation with room for an individual game's identity | Compact utility links and strong, game-specific typography |
| [Are.na](https://www.are.na/) | Clear text hierarchy and simple grouping | Short supporting copy and ordinary, legible controls |
| [Nintendo 2001 study](https://getdesign.md/nintendo-2001/design-md) | The page treated as a game instrument | A contained playing area and assertive display type |
| [PostHog study](https://getdesign.md/posthog/design-md) | Readable type and product character | Readable supporting text with a consistent visual vocabulary |

The first three sites were visited and visually inspected. The latter two are documented studies from Awesome Design MD. No layouts, logos, illustrations, or copy were imported from those sites.

The paper, red selection marks, six-ball rack logo, and condensed typography from the match-board pass have been retired. All four play modes, invite handling, keyboard behavior, and the earlier rules/lifecycle fixes remain.
