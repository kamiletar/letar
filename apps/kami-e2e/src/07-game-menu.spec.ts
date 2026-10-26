import { expect, test } from '@playwright/test'

/**
 * Главное меню как стартовое меню игры (KM-031): порядок, подписи, маркер, стрелки, выбор,
 * клик во время церемонии. Церемонию отключаем только там, где она мешает (reduced-motion).
 */
const KEYS = ['order', 'about', 'blog', 'contacts', 'friends']
const menu = (page: import('@playwright/test').Page) => page.locator('[data-testid="home-menu"] nav a')

test.describe('Игровое меню главной', () => {
  test.describe('без движения', () => {
    test.use({ reducedMotion: 'reduce' })

    test('7.1 — порядок, подписи, «Заказать сайт» ведёт на /site/', async ({ page }) => {
      await page.goto('/')
      const links = menu(page)
      await expect(links).toHaveCount(5)
      expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute('data-menu-key')))).toEqual(KEYS)
      await expect(links.first()).toHaveAttribute('href', /\/site\/$/)
      await expect(links.first()).toContainText('цена, сроки и как идёт работа')
      for (const el of await links.all()) {
        const box = await el.boundingBox()
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
    })

    test('7.2 — маркер у первого, стрелки по кругу, Home/End', async ({ page }) => {
      await page.goto('/')
      const marker = page.locator('[data-testid="home-menu"] nav a[data-active]')
      await expect(marker).toHaveCount(1)
      await expect(marker).toHaveAttribute('data-menu-key', 'order')
      await menu(page).first().focus()
      await page.keyboard.press('ArrowUp')
      await expect(marker).toHaveAttribute('data-menu-key', 'friends')
      await page.keyboard.press('ArrowDown')
      await expect(marker).toHaveAttribute('data-menu-key', 'order')
      await page.keyboard.press('End')
      await expect(marker).toHaveAttribute('data-menu-key', 'friends')
      await page.keyboard.press('Home')
      await expect(marker).toHaveAttribute('data-menu-key', 'order')
    })

    test('7.3 — выбор ведёт на посадочную, текст на месте', async ({ page }) => {
      await page.goto('/')
      await menu(page).first().click()
      await expect(page).toHaveURL(/\/site\/$/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test('7.4 — ctrl-клик не перехватывается', async ({ page, context }) => {
      await page.goto('/')
      const popup = context.waitForEvent('page')
      await menu(page).nth(1).click({ modifiers: ['Control'] })
      await (await popup).close()
      await expect(page).toHaveURL(/\/(ru\/)?$/)
    })
  })

  test.describe('с движением', () => {
    test('7.5 — клик по видимому пункту на ~4 с ведёт на страницу, по невидимому на ~1 с — нет', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      await page.waitForFunction(() => document.documentElement.dataset.kamiEntryRun === '1', null, { timeout: 15_000 })
      await page.waitForTimeout(900)
      await menu(page).nth(4).click({ force: true })
      await expect(page).not.toHaveURL(/#friends/)
      await page.reload()
      await page.waitForFunction(() => document.documentElement.dataset.kamiEntryRun === '1', null, { timeout: 15_000 })
      await page.waitForFunction(
        () => {
          const first = document.querySelector('[data-entry-menu]')
          return first && Number(getComputedStyle(first).opacity) > .9
        },
        null,
        { timeout: 15_000 },
      )
      await menu(page).first().click({ force: true })
      await expect(page).toHaveURL(/\/site\/$/)
    })

    test('7.6 — переход из меню набирает текст посадочной, reload — нет', async ({ page }) => {
      await page.goto('/')
      await page.evaluate(() => document.documentElement.removeAttribute('data-kami-entry'))
      await page.keyboard.press('Escape')
      await menu(page).first().click()
      await expect(page).toHaveURL(/\/site\/$/)
      // Текст уже в DOM целиком, часть его скрыта, пока набор идёт.
      await expect(page.locator('#site-title span[style*="hidden"]')).toHaveCount(1, { timeout: 1500 })
      await expect(page.locator('#site-title')).toContainText(/\S{3}/)
      await expect(page.locator('#site-title span[style*="hidden"]')).toHaveCount(0)
      await page.reload()
      expect(await page.locator('#site-title span[style*="hidden"]').count()).toBe(0)
    })

    test('7.8 — разлёт фона затухает, после возврата на главную пятна нет', async ({ page }) => {
      const burst = page.locator('[data-matrix-burst]')
      await page.goto('/')
      await page.evaluate(() => document.documentElement.removeAttribute('data-kami-entry'))
      await page.keyboard.press('Escape')
      // Пункт на той же странице: разлёт виден и сам сбрасывается меньше чем за секунду.
      await menu(page).nth(4).click()
      await expect(burst).toHaveCount(1)
      await expect(page).toHaveURL(/#friends$/)
      await expect(burst).toHaveCount(0, { timeout: 1500 })
      // Уход на другую страницу и возврат без перезагрузки: фон тот же, разлёт не остался.
      await menu(page).nth(1).click()
      await expect(page).toHaveURL(/\/about\/$/)
      await page.goBack()
      await expect(page).toHaveURL(/\/(#friends)?$/)
      await expect(menu(page).first()).toBeVisible()
      await expect(burst).toHaveCount(0)
    })
  })

  test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('7.7 — ссылки, подписи и порядок те же, маркера нет', async ({ page }) => {
      await page.goto('/')
      const links = menu(page)
      expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute('data-menu-key')))).toEqual(KEYS)
      await expect(links.first()).toContainText('цена, сроки')
      await expect(page.locator('[data-testid="home-menu"] nav a[data-active]')).toHaveCount(0)
    })
  })
})
