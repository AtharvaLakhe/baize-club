# Contributing to Obsidian

Thanks for wanting to help. Small fixes and big ideas are both welcome.

## Getting set up

```bash
npm install
npm run dev     # opens on http://localhost:5173
npm test
```

To test online play, open the dev server in two tabs (or two browsers) and join one from the other.

## Before you open a pull request

- `npm test` and `npm run typecheck` pass.
- If you change physics or rules, add or update a test in `tests/`. The rules engine in `src/core/rules.ts` is pure, so tests are quick to write.
- Keep the physics step deterministic: inside `step()` use only `+ - * /` and `Math.sqrt`. No `Math.hypot`, `Math.sin`, `**` or randomness, or browsers can disagree about where a ball stopped.
- Match the style around you: small functions, plain names, comments that explain *why*.

## Good places to start

- New cloth or cue: add an entry to `src/render/themes.ts`.
- New party rule: add a field to `Mutators` in `src/core/rules.ts`, map it in `tuningFor`, and describe it in `src/ui/lobby.ts`.
- Sound: everything is synthesized in `src/audio/sound.ts`.

## Reporting bugs

Open an issue with what you did, what you expected and what happened. For physics or rules bugs, the table code and roughly where the balls were helps a lot. A screenshot is even better.
