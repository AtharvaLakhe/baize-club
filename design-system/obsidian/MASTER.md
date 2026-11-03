# Obsidian club design system

Direction: a dark, premium billiards club with an actual interactive 3D table. Use realistic cloth/wood in the game and quiet, tactile controls around it. Typography carries the entrance; brass carries selection and primary actions.

UI UX Pro Max informed this system: verified `luxury dark premium` style matches (Skeuomorphism and Dark Mode), `luxury serif elegant` typography (Luxury Serif/Cormorant), Three.js smooth pointer follow, and cancellable state transitions. Its broad product search suggested a vibrant red sports palette, which does not fit the user's explicit dark premium choice; the palette below is intentional.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#111312` | Room background |
| `--surface` | `#1b1e1b` | Setup, dialogs, menus |
| `--surface-2` | `#252a24` | Hover/raised controls |
| `--text` | `#eee9dc` | Main content |
| `--text-2` | `#aeb7aa` | Supporting content |
| `--text-3` | `#969f90` | Quiet supporting content |
| `--gold` | `#c6a66b` | Primary action and selection |
| `--gold-hi` | `#debf86` | Hover/active brass |
| `--display` | Cormorant Garamond, Georgia, serif | Club headings and scores |
| `--font` | Manrope, system sans-serif | Controls and readable text |

## Layout

Home: invitation + live table, integrated game/mode setup, separate join form, short club details. Match room: identity header, focused central scoreboard, edge power/spin controls, quiet controls dock. Lobby: Players & invite / House rules tabs with a persistent start action. Profile and game decisions share one accessible modal lifecycle.

## Interaction and motion

- Update semantics immediately; never wait for animation to establish selected state.
- Preserve focused mode/game controls when choices change.
- Replace in-flight control animations using native Web Animations (180–420ms); orchestrate entrance once (700–800ms).
- Live preview: orbit, silent physics demo, pause/play, re-rack, pointer-follow lighting. Pause when hidden/offscreen. Reduced motion starts static and cancels decorative animation.
- Visible focus, text labels for ball groups, inline form errors, cancellable connections, focus-trapped dialogs, inert backgrounds.
- Layout QA at 375, 768, 1024, and 1440 pixels, plus phone landscape. No essential action relies on hover.
