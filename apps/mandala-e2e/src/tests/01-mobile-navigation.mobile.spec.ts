/**
 * Тесты мобильной навигации
 *
 * Проверяем адаптивность и мобильное меню
 */
import { expect, test } from '@playwright/test'

test.describe('Мобильная навигация', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  // Хелпер для закрытия PWA оффлайн-уведомления
  async function dismissOfflinePrompt(page: import('@playwright/test').Page) {
    // Ждём появления уведомления (анимация занимает время)
    await page.waitForTimeout(1000)
    const notNowButton = page.getByRole('button', { name: /не сейчас/i })
    if ((await notNowButton.count()) > 0) {
      await notNowButton.click()
      await page.waitForTimeout(500)
    }
  }

  test.describe('Мобильное меню', () => {
    // Главная страница имеет кастомную навигацию (HomeGrid), без стандартного header
    // Тестируем мобильное меню на внутренних страницах где есть header

    test('есть кнопка hamburger menu на внутренних страницах', async ({ page }) => {
      await page.goto('/mandalas')

      // Ждём загрузки страницы — логотип в header (first() т.к. есть и в footer)
      await expect(page.getByText('Elfafeya Art').first()).toBeVisible({ timeout: 10000 })

      // Ищем кнопку мобильного меню (aria-label="Открыть меню")
      const hamburger = page.getByRole('button', { name: 'Открыть меню' })
      await expect(hamburger).toBeVisible({ timeout: 5000 })
    })

    test('открывает drawer при клике на hamburger', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Ждём загрузки страницы (first() т.к. есть и в footer)
      await expect(page.getByText('Elfafeya Art').first()).toBeVisible({ timeout: 10000 })

      // Кликаем на hamburger
      const hamburger = page.getByRole('button', { name: 'Открыть меню' })
      await hamburger.click()

      // Ждём открытия drawer — Chakra UI использует Portal
      const drawer = page.locator('[role="dialog"]')
      await expect(drawer).toBeVisible({ timeout: 5000 })
    })

    test('drawer содержит навигационные ссылки', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Ждём загрузки страницы (first() т.к. есть и в footer)
      await expect(page.getByText('Elfafeya Art').first()).toBeVisible({ timeout: 10000 })

      // Открываем меню
      const hamburger = page.getByRole('button', { name: 'Открыть меню' })
      await hamburger.click()

      // Ждём drawer
      const drawer = page.locator('[role="dialog"]')
      await expect(drawer).toBeVisible({ timeout: 5000 })

      // Проверяем наличие ссылок в drawer (Галерея, Магазин)
      const galleryLink = drawer.getByRole('link', { name: 'Галерея' })
      const shopLink = drawer.getByRole('link', { name: 'Магазин' })

      await expect(galleryLink).toBeVisible()
      await expect(shopLink).toBeVisible()
    })
  })

  test.describe('Адаптивность страниц', () => {
    test('главная страница корректно отображается', async ({ page }) => {
      await page.goto('/')

      // Проверяем, что контент не выходит за границы экрана
      const body = await page.locator('body').boundingBox()
      expect(body?.width).toBeLessThanOrEqual(412) // Pixel 5 width
    })

    test('галерея мандал адаптивна', async ({ page }) => {
      await page.goto('/mandalas')

      // Проверяем, что страница загрузилась
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // Проверяем, что контент не выходит за границы
      const body = await page.locator('body').boundingBox()
      expect(body?.width).toBeLessThanOrEqual(412)
    })

    test('магазин адаптивен', async ({ page }) => {
      await page.goto('/shop')

      // Проверяем, что страница загрузилась
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // Проверяем, что контент не выходит за границы
      const body = await page.locator('body').boundingBox()
      expect(body?.width).toBeLessThanOrEqual(412)
    })
  })

  test.describe('Touch взаимодействия', () => {
    test('можно открыть мандалу касанием', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Ждём загрузки страницы
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

      // Тапаем на первую мандалу
      const mandalaCard = page.locator('a[href^="/mandalas/"]').first()
      const hasMandalas = (await mandalaCard.count()) > 0

      if (!hasMandalas) {
        test.skip()
        return
      }

      await mandalaCard.tap()
      await page.waitForURL(/\/mandalas\/.+/, { timeout: 10000 })

      // Ждём загрузки страницы мандалы — canvas или img
      const mandalaContent = page.locator('canvas, img').first()
      await expect(mandalaContent).toBeVisible({ timeout: 10000 })
    })
  })
})
