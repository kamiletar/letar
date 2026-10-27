import { expect, test } from '@playwright/test'

/**
 * Страница «Для друзей» (KM-039): блок вынесен с главной на свой адрес с metadata, canonical,
 * hreflang и записью sitemap, как `/contacts/` в KM-026.
 */
test.describe('Страница «Для друзей»', () => {
  test.use({ reducedMotion: 'reduce' })

  for (
    const [locale, path, title, write] of [
      ['ru', '/friends/', 'Для друзей', 'Написать мне'],
      ['en', '/en/friends/', 'For friends', 'Get in touch'],
    ] as const
  ) {
    test(`11.1 — ${locale}: открывается напрямую и по reload`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
      await expect(page.getByRole('link', { name: write })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    })

    test(`11.2 — ${locale}: canonical и hreflang`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`))
      await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute('href', /\/friends\/$/)
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/en\/friends\/$/)
    })
  }

  test('11.3 — пункт меню главной ведёт на /friends/, ссылок на /#friends нет', async ({ page }) => {
    await page.goto('/')
    const link = page.locator('[data-testid="home-menu"] nav a[data-menu-key="friends"]')
    await expect(link).toHaveAttribute('href', /\/friends\/$/)
    expect(await page.locator('a[href*="#friends"]').count()).toBe(0)
    await link.click()
    await expect(page).toHaveURL(/\/friends\/$/)
  })

  test('11.4 — страница есть в sitemap с альтернативами', async ({ request }) => {
    const text = await (await request.get('/sitemap.xml')).text()
    expect(text).toMatch(/<loc>[^<]*\/friends\/<\/loc>/)
    expect(text).toMatch(/<loc>[^<]*\/en\/friends\/<\/loc>/)
  })
})
