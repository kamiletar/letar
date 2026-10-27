import { expect, type Page, test } from '@playwright/test'
import { confirmLanguage } from './support/entry'

/**
 * Главная как один полноэкранный стартовый экран (KM-039): высота `100dvh` без прокрутки, без шапки и
 * подвала, значки в углу вместо шапки, одна нижняя строка, cookie-баннер только после входа.
 * Остальные страницы сохраняют шапку и подвал. Вход пропускаем флагом «уже видел» или reduced-motion,
 * кроме проверок самого входа.
 */

const SIZES = [
  { name: '390×844', width: 390, height: 844 },
  { name: '1440×900', width: 1440, height: 900 },
] as const

const layout = (page: Page) =>
  page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    header: document.querySelector('header') !== null,
    footer: document.querySelector('footer') !== null,
  }))

test.describe('Полноэкранная главная', () => {
  test.describe('финальный кадр', () => {
    test.use({ reducedMotion: 'reduce' })

    for (const path of ['/', '/en/']) {
      for (const size of SIZES) {
        test(`12.1 — ${path} на ${size.name}: нет прокрутки, шапки и подвала`, async ({ page }) => {
          await page.setViewportSize({ width: size.width, height: size.height })
          await page.goto(path)
          await expect(page.locator('[data-testid="home-menu"] nav a')).toHaveCount(5)
          await expect(page.getByRole('button', { name: /Принять все|Accept all/ })).toBeVisible()
          const state = await layout(page)
          expect(state.scrollHeight).toBe(state.innerHeight)
          expect(state.scrollWidth).toBe(state.innerWidth)
          expect(state.header).toBe(false)
          expect(state.footer).toBe(false)
        })
      }
    }

    test('12.2 — внизу одна строка: политика ПДн, cookie, версия; она не перекрыта баннером', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/')
      const line = page.locator('[data-entry-footer]')
      await expect(line.getByRole('link', { name: 'Политика ПДн' })).toHaveAttribute('href', /\/privacy\/$/)
      await expect(line).toContainText(/v\d+\.\d+\.\d+/)
      const banner = page.locator('[data-letar-cookie-banner]')
      await expect(banner).toBeVisible()
      // Высоту баннер публикует после первого кадра: ждём, пока строка поднимется над ним.
      await expect.poll(async () => {
        const lineBox = await line.boundingBox()
        const bannerBox = await banner.boundingBox()
        return (bannerBox?.y ?? 0) - ((lineBox?.y ?? 0) + (lineBox?.height ?? 0))
      }).toBeGreaterThanOrEqual(-1)
    })

    test('12.3 — значки в углу: язык, тема, вход, повтор; цели ≥ 44 px, достижимы с клавиатуры', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/')
      const corner = page.locator('[data-entry-corner]')
      await expect(corner).toBeVisible()
      // Повтор входа при reduced-motion не показывается: остальные значки на месте.
      await expect(corner.getByRole('button', { name: 'Переключить тему' })).toBeVisible()
      for (const control of await corner.locator('button:visible, a:visible').all()) {
        const box = await control.boundingBox()
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5)
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
      }
      await corner.getByRole('button', { name: 'Переключить тему' }).focus()
      await expect(corner.getByRole('button', { name: 'Переключить тему' })).toBeFocused()
    })

    test('12.4 — другие страницы сохраняют шапку и подвал, возврат на главную их убирает без перезагрузки', async ({ page }) => {
      await page.goto('/about/')
      const state = await layout(page)
      expect(state.header).toBe(true)
      expect(state.footer).toBe(true)
      await page.locator('a[aria-label="Главная страница"]:visible').first().click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page.locator('[data-testid="home-menu"] nav a').first()).toBeVisible()
      const home = await layout(page)
      expect(home.header).toBe(false)
      expect(home.footer).toBe(false)
      expect(home.scrollHeight).toBe(home.innerHeight)
    })
  })

  test.describe('вход', () => {
    test.describe.configure({ mode: 'default', retries: 2 })

    test('12.5 — баннер cookie и значки скрыты, пока идёт вход; после входа появляются', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      const banner = page.locator('[data-letar-cookie-banner]')
      // На экране языка и в первые секунды загрузки баннера и значков нет.
      await expect(page.locator('[data-entry-language]')).toBeVisible()
      await expect(banner).toBeHidden()
      await confirmLanguage(page)
      await page.waitForTimeout(1500)
      await expect(banner).toBeHidden()
      await expect(page.locator('[data-entry-corner]')).toBeHidden()
      await page.waitForFunction(() => !document.documentElement.dataset.kamiEntry, null, { timeout: 15_000 })
      await expect(banner).toBeVisible()
      await expect(page.locator('[data-entry-corner]')).toBeVisible()
      const state = await layout(page)
      expect(state.scrollHeight).toBe(state.innerHeight)
    })

    test('12.6 — на сенсорном экране подсказка говорит про касание, а не про клавиши', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      })
      const page = await context.newPage()
      await page.goto('/')
      await expect(async () => {
        await page.locator('[data-entry-language] [data-language="ru"]').click({ timeout: 1000 })
        await expect(page.locator('[data-entry-hints]')).toContainText('Нажмите, чтобы пропустить', { timeout: 1000 })
      }).toPass({ timeout: 15_000 })
      await context.close()
    })
  })
})
