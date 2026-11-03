# Obsidian interactive-eight design system

The entrance is one open playroom: a wide wordmark with an oversized black eight-ball in front of it. Dragging or activating the ball rolls it aside to reveal the actual table. Two smaller billiard balls give the scene scale. A direct play dock and invite form remain available without interacting with the visual.

The user rejected both the luxury treatment and the paper match-board treatment, then requested more originality and interactive animation. This pass makes the billiard ball itself the interaction. UI UX Pro Max informed the single-pointer alternative, keyboard behavior, and reduced-motion handling. The Playwright plugin was used for actual mouse/touch interaction, video, and visual checks. See [references and decisions](REFERENCES.md).

| Token | Value | Role |
|---|---|---|
| `--bg` | `#191921` | Page and game room |
| `--bg-2` | `#101015` | Recessed controls |
| `--surface` | `#22222d` | Dialogs and scoreboard |
| `--text` | `#eeede5` | Chalk lettering |
| `--text-3` | `#a7a6b7` | Supporting copy |
| `--accent` | `#c4c5e4` | Actions, selection, focus |
| `--gold-ink` | `#1c1c2b` | Text on the light accent |
| `--display` | Syne | Wordmark, headings, scoreboard |
| `--font` | DM Sans | Controls and body text |

## Layout

Home: compact navigation, central interactive stage, mode dock with a separate invite form, short rules, footer. The stage and table share space; there is no separate marketing hero. On mobile, the stage compresses and modes form two columns. Dark, solid surfaces carry the identity into the lobby, dialogs, and scoreboard. Preserve the tabbed lobby, persistent start action, and shared accessible modal lifecycle.

## Interaction and motion

- Update semantics immediately; never wait for animation to establish selected state.
- Preserve focused mode/game controls when choices change.
- The eight follows a bounded spring while dragged; its number patch tilts in response to the pointer. Release after a horizontal drag, click, tap, Enter, or Space reveals the table. Reset restores the ball. Cancelled gestures restore its pose.
- Use one deliberate reveal/return animation. No idle auto-spinning, background pointer spotlight, or scrolling choreography. The spring stops when settled, hidden, covered, or destroyed. Clear previous release offsets on reset.
- Live preview: silent ball movement with a stable overview camera, pause/play, and re-rack. Pause while covered, hidden, or offscreen. Reduced motion skips all ball rolling and parallax, with a static preview until explicitly played.
- Visible focus, text labels for ball groups, inline form errors, cancellable connections, focus-trapped dialogs, inert backgrounds.
- Layout QA at 375, 768, 1024, and 1440 pixels, plus phone landscape. No essential action relies on hover.
