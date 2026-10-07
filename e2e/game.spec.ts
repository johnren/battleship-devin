import { expect, test, type Page } from '@playwright/test'

const SEED = 123

async function enemyCellLabels(page: Page): Promise<string[]> {
  return page.getByTestId('enemy-board').locator('button').evaluateAll((els) =>
    els.map((e) => e.getAttribute('aria-label') ?? ''),
  )
}

/** Simple hunt/target player that reads only the enemy grid's accessible labels. */
function pickShot(labels: string[]): number {
  const state = (i: number) => labels[i].split(', ').slice(1).join(', ')
  const untried = (i: number) => state(i) === 'water'
  for (let i = 0; i < 100; i++) {
    if (state(i) !== 'hit') continue
    const r = Math.floor(i / 10)
    const c = i % 10
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && untried(nr * 10 + nc)) return nr * 10 + nc
    }
  }
  for (let i = 0; i < 100; i++) if (untried(i) && (Math.floor(i / 10) + (i % 10)) % 2 === 0) return i
  return labels.findIndex((_, i) => untried(i))
}

test('plays a full seeded game to game over', async ({ page }) => {
  await page.goto(`?seed=${SEED}`)
  await expect(page.getByRole('heading', { name: 'Battleship' })).toBeVisible()

  const start = page.getByRole('button', { name: 'Start' })
  await expect(start).toBeDisabled()
  await page.getByRole('button', { name: 'Randomize' }).click()
  await expect(start).toBeEnabled()
  await start.click()

  const turn = page.getByTestId('turn-indicator')
  const dialog = page.getByRole('dialog')
  const enemyCells = page.getByTestId('enemy-board').locator('button')

  for (let shot = 0; shot < 100; shot++) {
    await expect(turn).toHaveText(/Your turn|You won|You lost/, { timeout: 5_000 })
    if (await dialog.isVisible()) break
    const index = pickShot(await enemyCellLabels(page))
    await enemyCells.nth(index).click()
    // Exactly one shot per turn: the grid locks until the computer has fired.
    await expect(turn).toHaveText(/Enemy firing…|You won/)
  }

  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading')).toHaveText(/Victory|Defeat/)
  await expect(dialog).toContainText('Shots fired')
  await expect(dialog).toContainText('Hit accuracy')

  await dialog.getByRole('button', { name: 'Play Again' }).click()
  await expect(dialog).toBeHidden()
  await expect(turn).toHaveText('Place your fleet')
  await expect(start).toBeDisabled()
})
