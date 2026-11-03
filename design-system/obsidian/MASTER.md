# Obsidian match-board design system

The visual reference is a billiards match board: a felt playing area beside a printed score sheet. The site opens at the table and setup controls. Its identity comes from heavy condensed type, a six-ball rack mark, green/paper contrast, and vermilion selection colour.

Live references were opened and visually inspected through the Playwright plugin. Historical/product studies came from Awesome Design MD. UI UX Pro Max informed focus, contrast, touch targets, and responsive checks. The composition and palette are specific to this billiards app. See [references and decisions](REFERENCES.md).

| Token | Value | Role |
|---|---|---|
| Page | `#dbe0d8` | Outside the match board |
| Paper | `#f1f2e8` | Setup, dialogs, menus |
| Ink | `#243126` | Paper text and boundaries |
| Felt stage | `#1d4938` | Home table area |
| `--bg` | `#182d25` | Game room background |
| `--accent` | `#c93c25` | Actions and selection |
| Focus | `#3c62ce` | Input focus |
| `--display` | Barlow Condensed, Impact, condensed sans-serif | Headings and scoreboard |
| `--font` | IBM Plex Sans, Arial, sans-serif | Controls and body text |

## Layout

Home: masthead, table-and-setup board, short rules, footer. Mobile stacks the compact table above setup. Mode choices form a score-sheet list. The lobby and dialogs use paper surfaces; gameplay uses a dark scoreboard and the actual 3D table. Preserve the tabbed lobby, persistent start action, and shared accessible modal lifecycle.

## Interaction and motion

- Update semantics immediately; never wait for animation to establish selected state.
- Preserve focused mode/game controls when choices change.
- Keep feedback short and functional. The pointer spotlight and entrance choreography are removed.
- Live preview: silent ball movement with a stable overview camera, pause/play, and re-rack. Pause when hidden/offscreen. Reduced motion starts static.
- Visible focus, text labels for ball groups, inline form errors, cancellable connections, focus-trapped dialogs, inert backgrounds.
- Layout QA at 375, 768, 1024, and 1440 pixels, plus phone landscape. No essential action relies on hover.
