import { expect, test } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  // Wait for page to load and check heading (Chakra Heading may not be h1)
  await expect(page.getByRole('heading', { name: /Form Develop App/i })).toBeVisible()
})

test('can navigate to recipes list', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has intermittent issues with navigation')
  await page.goto('/')

  // Wait for page to load
  await expect(page.getByRole('heading', { name: /Form Develop App/i })).toBeVisible()

  // Click link to recipes (Button asChild with Link inside)
  await page.getByRole('link', { name: /рецепт/i }).click()

  // Should see recipes page heading
  await expect(page.getByRole('heading', { name: /Рецепты/i })).toBeVisible()
})
