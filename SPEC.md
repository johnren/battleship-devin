Goal
Build a single-player Battleship game that runs in the browser, where a human plays against a computer opponent. It must be fully playable from a public URL, well tested, and deployed from a public GitHub repo. Correctness matters more than visual polish.
Definition of done: the live URL loads; a full game can be played to a win and to a loss; npm test, npm run lint, npm run build, and the end-to-end test all pass in CI; README and BUGS.md are complete.
Tech stack
• React with Vite and TypeScript (strict mode on)
• Vitest for unit tests, Playwright for one end-to-end smoke test, ESLint for linting. Use current stable versions and the current Node LTS, and list versions in the README
• Plain CSS (no UI component library)
• No backend, no database, no login, no external APIs
Game rules
• Each side has a 10×10 grid. Rows are labeled A–J, columns 1–10.
• Each side has five ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2). That is 17 ship cells per side.
• Ships are placed horizontally or vertically, never diagonally. They must sit fully on the board and must not overlap. Ships may touch.
• The player fires first. Turns alternate, one shot per turn. A hit does not grant an extra turn.
• Each shot is reported as Hit, Miss, or Sunk with the ship's name (for example, "You sank the Cruiser").
• A side wins when all 17 of the opponent's ship cells are hit.
Ship placement
• The player places ships one at a time: pick a ship, see a preview while hovering over the grid, click to place. On touch screens, the first tap shows the preview and a second tap on the same cell confirms.
• A Rotate button, the R key, and the spacebar each toggle between horizontal and vertical. During placement the spacebar must not scroll the page or activate a focused button.
• An invalid position (off the board or overlapping) previews in red and cannot be placed.
• A Randomize button places the whole fleet randomly and validly. A Reset button clears placement.
• The Start button stays disabled until all five ships are placed.
• The computer places its fleet randomly using the same validation rules.
Turn flow
• The player fires by clicking a cell on the enemy grid.
• Cells already fired at cannot be fired at again and do not use up a turn. Rapid repeated clicks must never fire more than one shot per turn.
• The player's grid and the enemy grid are locked while the computer takes its turn.
• The computer fires after a short delay (about 600 ms) so the player can follow the action.
• A clear indicator shows whose turn it is.
• At game over, show the winner, reveal the computer's remaining ships, and offer Play Again. Play Again fully resets all state, including cancelling any pending computer move.
Computer opponent
Use a hunt/target strategy:
• Hunt mode: fire at random untried cells in a checkerboard pattern (every other cell), since the smallest ship is 2 long.
• Target mode: after a hit, try the adjacent cells (up, down, left, right). Once two hits line up, continue along that line in both directions until the ship sinks.
• After a sink, return to hunt mode unless other hits remain unresolved, in which case keep targeting them.
• Never fire at the same cell twice. Never fire off the board. Fair play: the computer may use only what a human opponent would know (its own past shots, hit or miss results, and which ship was sunk). It must never read the player's ship positions.
• Use a seedable random number generator so tests are repeatable. Opening the game with ?seed=123 in the URL makes both the computer's fleet and its shots repeatable, so any bug can be reproduced.
Interface
• Show both grids with row and column labels: "Your fleet" and "Enemy waters".
• Distinct visual states for water, your ship, hit, miss, and sunk ship.
• A fleet status list for each side showing which ships are still afloat.
• A short message log of recent shots.
• Grids sit side by side on desktop and stack vertically on screens 640 px wide or less. Must be usable at 375 px wide.
• Each grid cell has an accessible label, such as "B7, miss".
• Must work in current Chrome, Safari, and Firefox.
Visual design
Theme: a naval chart at night. Dark navy, flat, clean, high contrast. No images, icon libraries, or web fonts; everything is CSS.
Colors (define as CSS variables)
Token
Hex
Used for
--bg
#0B1726
Page background
--panel
#12243A
Panels, game-over dialog
--water
#1C3A5E
Empty grid cells
--grid-line
#2E5480
Cell borders
--text
#E6EEF7
Main text
--text-muted
#8FA7C0
Labels, secondary text
--ship
#7A8B99
Your ships
--hit
#E5484D
Hit marker, invalid placement preview
--sunk
#7A1F24
Cells of a sunk ship
--miss
#CFE3F5
Miss marker
--valid
#3DD68C
Valid placement preview
--accent
#F2B33D
Primary buttons, turn indicator, hover and focus outlines
Typography
• System font stack for all text; a monospace stack for coordinates ("B7") and grid labels.
• Sizes: title 28 px, section headings 18 px, body 15 px, grid labels 12 px.
Layout
• Header: game title on the left, turn indicator on the right.
• Below it, the two boards side by side ("Your fleet" left, "Enemy waters" right), each with its fleet status list underneath.
• During placement, the ship picker and the Rotate, Randomize, Reset, and Start buttons sit above the boards.
• Message log below the boards, showing the latest 5 shots, newest first.
• Each board is at most 400 px wide and shrinks to fit the screen with 16 px side margins. Cells stay square; 2 px gaps between cells.
Cell states (never rely on color alone)
• Water: --water.
• Your ship: --ship.
• Miss: small --miss dot centered in the cell.
• Hit: bold ✕ in --hit.
• Sunk: --sunk fill with the ✕ kept, for every cell of that ship.
• Placement preview: --valid or --hit at 50% opacity across all cells the ship would cover.
• Enemy cell you can fire at: --accent outline on hover and keyboard focus, crosshair cursor. Already-fired cells and all cells during the computer's turn: no hover effect, default cursor.
Controls and feedback
• Primary buttons (Start, Play Again): --accent background, dark text. Other buttons: outlined. Every button and cell is at least 44 px tall on touch screens.
• Turn indicator: "Your turn" as an --accent pill; "Enemy firing…" muted, with a softly pulsing dot.
• Messages in plain words: "Hit at B7.", "Miss at C3.", "You sank their Cruiser!", "They hit your Battleship at E5."
• Fleet status: each ship's name with a row of small squares, one per cell, filling --hit as it takes damage; sunk ships are struck through.
• Game over: a centered --panel dialog over a dimmed page, showing "Victory" or "Defeat", shots fired, hit accuracy as a percentage, and Play Again.
Motion and accessibility
• Shot markers scale in over 150 ms; a sunk ship's cells flash once. With reduced-motion turned on in the operating system, skip all animation.
• Text meets WCAG AA contrast against its background.
• Grid cells are real buttons, so Tab and Enter work for firing; a visible --accent focus outline is always shown.
• Sound is out of scope.
Architecture
• Put all game logic in src/game/ as plain TypeScript with no React imports: board, ships, placement, firing, win detection, computer opponent, random number generator.
• Put UI in src/components/. Manage game state with useReducer, and keep state updates immutable.
• Represent a coordinate as { row, col }, both 0–9. Convert to labels like "B7" only in the UI.
Testing
Write Vitest unit tests that cover at least:
• Placement validation: every edge, overlaps, and no wrapping from column 10 to column 1 or from row J to row A
• Firing: hit, miss, repeated shot rejected
• Sunk detection for every ship and win detection
• Computer opponent: in 100 simulated full games it never repeats a shot, never fires off the board, and never returns to hunt mode while it has hits on a ship that is not yet sunk
• Play Again fully resets state, including a pending computer move
Add one Playwright end-to-end test that opens the built game with a fixed seed, randomizes placement, starts, and plays until game over.
npm test, npm run lint, and npm run build must all pass with no errors.
Deployment
• Public GitHub repository, starting empty except for a README.
• Deploy to GitHub Pages with a GitHub Actions workflow that builds and publishes on every push to main. Set Vite's base to match the repo name.
• Put the live game URL at the top of the README.
The workflow runs lint, unit tests, and the end-to-end test first, and deploys only if all pass.
Deliverables
• Live, playable URL
• Public repo with clear commit messages, committed after each working step
• README.md: live link, how to play, how to run locally and run tests, a short architecture overview, and how the computer opponent works
• BUGS.md: every bug found during development, each with symptom, root cause, fix, how it was found (manual play, test, or code review), and the test added to prevent it. Add each entry when the bug is found, not at the end, and note the commit that fixed it. Record real bugs honestly; do not invent any.
Out of scope
Multiplayer, accounts, backend, saving games, sound, difficulty levels, the Salvo variant, and animations beyond simple transitions.
Milestones
Build in four milestones. Work on a branch and open a pull request at the end of each milestone with a one-line status; I will merge it. Keep working on the next milestone unless you are blocked.
1. Game logic and unit tests, no UI
2. Ship placement screen
3. Full gameplay against the computer opponent
4. End-to-end test, CI, deployment, README, and BUGS.md
How to work
• Before writing code, briefly state your plan and file structure, then build.
• Do not add features beyond this spec. If something is ambiguous, choose the simplest reasonable option and note the choice in the README.
• Never commit secrets or API keys.
• Before saying you are done, run tests, lint, and build, play a full game against the computer, and report the results.
