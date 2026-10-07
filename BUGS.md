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
