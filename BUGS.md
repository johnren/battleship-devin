# Bugs

Every bug found during development, recorded when it was found.

<!-- Entry format:
## N. Title
- **Symptom:**
- **Root cause:**
- **Fix:** (commit)
- **Found by:** manual play / test / code review
- **Regression test:**
-->

## 1. Touch placement preview disappears after the first tap

- **Symptom:** On a touch screen, tapping a cell on "Your fleet" showed no preview, and tapping the same cell again also did nothing, so ships could not be placed by touch at all.
- **Root cause:** After a tap, mobile browsers emit compatibility mouse events, including `mouseleave` on the tapped cell and the grid right after `click`. The grid's `onMouseLeave` handler cleared both the hover preview and the pending-tap cell, wiping the first tap's state before the second tap.
- **Fix:** Hover enter/leave now use pointer events and only react when `pointerType === 'mouse'`; touch preview state is driven only by taps. Commit `dd14ebb`.
- **Found by:** Manual play (scripted touch play in Playwright with touch emulation at 375 px).
- **Regression test:** `e2e/touch-placement.spec.ts` (fails before the fix, passes after).

## 2. Grid cells smaller than 44 px on touch screens

- **Symptom:** At 375 px on a touch screen, grid cells were 29.4 px tall, while SPEC.md requires every button and cell to be at least 44 px tall on touch screens.
- **Root cause:** Boards shrink to fit the screen (at most 400 px, 16 px side margins) with square cells, so 10 cells plus a label column only get about 29 px each at 375 px. The two requirements can't both hold; the repo owner chose 44 px cells with sideways scrolling.
- **Fix:** On `(pointer: coarse)`, cells are fixed at 44 × 44 px and each grid sits in a `.grid-scroll` container that scrolls horizontally inside its board, so the page itself never scrolls sideways. Mouse/desktop layout is unchanged. Commit `a76cbdc`.
- **Found by:** Manual play-test with touch emulation at 375 px (measured cell size).
- **Regression test:** `e2e/touch-layout.spec.ts` (cells ≥ 44 px, no page-level horizontal overflow, tapping a scrolled-into-view cell still previews).
