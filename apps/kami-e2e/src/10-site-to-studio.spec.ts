import { expect, test } from '@playwright/test'

/**
 * Короткая /site/ (KM-036): без цен, две кнопки ведут на страницу услуг студии
 * с UTM-метками и from=kami, код ?ref переносится без изменений.
 */
const CASES = [
  { locale: 'ru', path: '/site/', studioPath: '/uslugi/' },
  { locale: 'en', path: '/en/site/', studioPath: '/en/services/' },
] as const

const cta = (page: import('@playwright/test').Page, place: 'hero' | 'final') =>
  place === 'hero'
    ? page.locator('section[aria-labelledby="site-title"] a[href*="utm_content=hero"]')
    : page.locator('section[aria-labelledby="site-final-title"] a[href*="utm_content=final"]')

test.describe('/site/ ведёт в студию', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const { locale, path, studioPath } of CASES) {
    test(`10.1 ${locale} — адрес и метки обеих кнопок`, async ({ page }) => {
      await page.goto(path)
      for (const place of ['hero', 'final'] as const) {
        const href = await cta(page, place).getAttribute('href')
        const url = new URL(href!)
        expect(url.pathname).toBe(studioPath)
        expect(Object.fromEntries(url.searchParams)).toEqual({
          utm_source: 'kami',
          utm_medium: 'referral',
          utm_campaign: 'site',
          utm_content: place,
          from: 'kami',
        })
      }
    })

    test(`10.2 ${locale} — код ref уходит в ссылку без изменений`, async ({ page }) => {
      await page.goto(`${path}?ref=Ab-12_x`)
      for (const place of ['hero', 'final'] as const) {
        await expect(cta(page, place)).toHaveAttribute('href', /[?&]ref=Ab-12_x(&|$)/)
        const url = new URL((await cta(page, place).getAttribute('href'))!)
        expect(url.searchParams.get('utm_content')).toBe(place)
        expect(url.searchParams.get('from')).toBe('kami')
      }
    })

    test(`10.3 ${locale} — на странице нет цен, условий и FAQ`, async ({ page }) => {
      await page.goto(path)
      const text = await page.locator('main').innerText()
      expect(text).not.toMatch(/₽|RUB|руб\./i)
      expect(text).not.toMatch(/\d\s?\d{3}/)
      await expect(page.locator('details, [data-testid="offer-faq"], [data-testid="offer-terms"]')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]').filter({ hasText: 'FAQPage' })).toHaveCount(0)
    })
  }

  test('10.4 — без ref на странице нет параметра ref', async ({ page }) => {
    await page.goto('/site/')
    await expect(cta(page, 'hero')).toBeVisible()
    expect(await cta(page, 'hero').getAttribute('href')).not.toContain('ref=')
  })

  test('10.5 — 375 px без горизонтальной прокрутки', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    for (const path of ['/site/', '/en/site/']) {
      await page.goto(path)
      await expect(cta(page, 'hero')).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    }
  })
})
