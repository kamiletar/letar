/**
 * Тесты SEO
 *
 * Проверяем метатеги, title, description для основных страниц
 */
import { expect, test } from '@playwright/test'

test.describe('SEO', () => {
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

  test.describe('Главная страница', () => {
    test('имеет корректный title', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveTitle(/Elfafeya|мандал/i)
    })

    test('имеет meta description', async ({ page }) => {
      await page.goto('/')
      // Ждём полной загрузки страницы (meta теги должны быть в head)
      await page.waitForLoadState('domcontentloaded')
      // Meta description должен быть не пустым (минимум 20 символов для осмысленного текста)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/, { timeout: 10000 })
    })

    test('имеет Open Graph теги', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/)
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/)
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/)
    })
  })

  test.describe('Галерея мандал', () => {
    test('имеет корректный title', async ({ page }) => {
      await page.goto('/mandalas')
      await expect(page).toHaveTitle(/.{10,}/)
    })

    test('имеет meta description', async ({ page }) => {
      await page.goto('/mandalas')
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
    })
  })

  test.describe('Магазин', () => {
    test('имеет корректный title', async ({ page }) => {
      await page.goto('/shop')
      await expect(page).toHaveTitle(/.{10,}/)
    })

    test('имеет meta description', async ({ page }) => {
      await page.goto('/shop')
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
    })
  })

  test.describe('Страница мандалы', () => {
    test('имеет уникальный title', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href^="/mandalas/"]').first()
      const count = await mandalaLink.count()

      // Пропускаем тест если нет мандал (test.fixme вместо skip)
      test.fixme(count === 0, 'Нет мандал для тестирования')

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Title не должен быть generic
      await expect(page).not.toHaveTitle(/^Elfafeya Art$/)
      await expect(page).toHaveTitle(/.{10,}/)
    })
  })

  test.describe('Sitemap и robots', () => {
    test('/sitemap.xml доступен', async ({ page }) => {
      const response = await page.goto('/sitemap.xml')
      expect(response?.status()).toBe(200)
    })

    test('/robots.txt доступен', async ({ page }) => {
      const response = await page.goto('/robots.txt')
      expect(response?.status()).toBe(200)
    })
  })
})
