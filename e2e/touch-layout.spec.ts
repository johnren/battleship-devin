import { expect, test } from '@playwright/test'

test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 800 } })

test('touch: cells are at least 44 px and only the grid scrolls sideways', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox does not support touch emulation')
  await page.goto('?seed=1')

  for (const id of ['player-board', 'enemy-board']) {
    const box = await page.getByTestId(id).getByRole('button', { name: /^J10,/ }).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  }

  const pageOverflow = await page.evaluate<number>('document.documentElement.scrollWidth - window.innerWidth')
  expect(pageOverflow).toBeLessThanOrEqual(0)

  const cell = page.getByTestId('player-board').getByRole('button', { name: /^C10,/ })
  await cell.scrollIntoViewIfNeeded()
  await cell.tap()
  await expect(page.locator('.cell--preview-invalid')).toHaveCount(1)
})
