import { expect, test } from '@playwright/test'

// Regression test for BUGS.md #1: on touch screens the first tap must keep showing the preview.
test.use({ hasTouch: true, viewport: { width: 375, height: 800 } })

test('touch: first tap previews, second tap on the same cell places', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox does not support touch emulation')
  await page.goto('?seed=1')
  const cell = page.getByTestId('player-board').getByRole('button', { name: /^D3,/ })
  await cell.tap()
  await expect(page.locator('.cell--preview-valid')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Carrier (5)' })).toBeEnabled()
  await cell.tap()
  await expect(page.getByRole('button', { name: 'Carrier (5)' })).toBeDisabled()
  await expect(cell).toHaveAttribute('aria-label', 'D3, Carrier')
})
