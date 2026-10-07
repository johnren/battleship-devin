# Battleship

Single-player Battleship in the browser: you against a computer opponent on a 10×10 grid.

**Live:** https://johnren.github.io/battleship-devin/

Add `?seed=<number>` to the URL (for example `?seed=123`) to make the computer's fleet and every computer shot reproducible.

## How to play

1. **Place your fleet** on "Your fleet": pick a ship (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2), hover to preview (green = valid, red = invalid), click to place. Rotate with the **Rotate** button, **R**, or **Space**. On touch screens, tap once to preview and tap the same cell again to place. On touch screens cells are 44 px, so on narrow phones each grid scrolls sideways. **Randomize** places everything for you, **Reset** clears the board.
2. **Start** unlocks once all five ships are placed.
3. **Fire** by clicking a cell on "Enemy waters" (or Tab to it and press Enter). You always fire first; turns alternate and a hit does not earn another shot. Firing at a cell you already tried is rejected and costs nothing.
4. The computer fires about 600 ms later. The message log and fleet status panels show what happened.
5. Sink all 17 enemy ship cells to win. At game over the enemy's remaining ships are revealed; **Play Again** starts fresh.

Cell markers: red ✕ = hit, pale dot = miss, dark red cell with a pale ✕ = sunk. Each cell's state is also in its accessible name (for example "B7, hit").

## Local development

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev        # http://localhost:5173/battleship-devin/
```

## Tests and checks

```sh
npm test           # Vitest unit tests (game logic, AI, reducer)
npm run lint       # ESLint
npm run build      # type-check (tsc -b, strict) + production build to dist/
npx playwright install --with-deps   # once, to get browsers
npm run test:e2e   # Playwright: builds, serves on :4173, runs e2e/ in Chromium, Firefox, WebKit
```

CI (`.github/workflows/ci.yml`) runs lint, unit tests, build and end-to-end tests on every PR and push; pushes to `main` that pass are deployed to GitHub Pages.

## Architecture

```
src/game/         pure TypeScript, no React
  types.ts        board size, fleet, coordinates, shot results
  rng.ts          seedable Mulberry32 RNG (state can be saved and restored)
  board.ts        immutable board: ships + shot grid, sunk / all-sunk checks
  placement.ts    ship cells, bounds/overlap validation (no wrapping), random fleet
  firing.ts       fire(board, coord) -> miss | hit | sunk, rejects repeats
  ai.ts           computer opponent (hunt/target), sees only its own shot results
  game.ts         gameReducer: placement -> playing -> gameover, turn tokens
src/components/   React UI (App, BoardGrid, PlacementControls, TurnIndicator,
                  FleetStatus, MessageLog, GameOverDialog)
e2e/              Playwright tests
```

All state lives in one `useReducer(gameReducer)`; every update returns new objects. The computer's turn is a 600 ms timer that dispatches `COMPUTER_FIRE` with the current `gameId` and `turnId`. The timer is cleared when the turn or game changes, and the reducer also ignores any move whose tokens are stale, so a pending computer shot can never land after Play Again.

## The computer opponent

The computer keeps its own record of where it has fired and what each shot returned; it never reads your ship positions.

- **Hunt:** with no unresolved hits, it fires at a random untried cell on a checkerboard pattern (every ship is at least 2 long, so this covers the board in half the shots), falling back to any untried cell.
- **Target:** after a hit, it tries the four neighbours. Once two hits line up, it keeps firing along that line in both directions until the ship sinks.
- When a ship sinks, those cells are resolved. If other hits remain (two ships touching), it stays in target mode on those before returning to hunt.

With a seed, the computer's fleet and its shot choices come from a dedicated RNG stream, so the same seed and the same player moves always give the same game. Randomizing your own fleet uses a separate stream and doesn't change the computer's behaviour.

## Versions

Node 24.21.0, npm 11.19.0, React 19.3.0, Vite 8.3.3, TypeScript 6.0.3 (strict), Vitest 5.0.3, ESLint 10.12.0 (typescript-eslint 8.71.1), Playwright 1.63.0.

See [BUGS.md](BUGS.md) for bugs found during development and how they were fixed.
