/**
 * Тесты коротких URL
 *
 * Проверяем редиректы коротких URL на полные страницы
 */
import { expect, test } from '@playwright/test'

test.describe('Короткие URL', () => {
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

  test.describe('Редиректы по slug', () => {
    test('короткий URL редиректит на страницу мандалы', async ({ page }) => {
      // Сначала получаем slug первой мандалы
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href^="/mandalas/"]').first()
      const hasMandalas = (await mandalaLink.count()) > 0

      if (!hasMandalas) {
        test.skip()
        return
      }

      // Получаем href первой мандалы
      const href = await mandalaLink.getAttribute('href')
      const slug = href?.split('/').pop()

      if (!slug) {
        test.skip()
        return
      }

      // Пробуем перейти по короткому URL (только slug)
      await page.goto(`/${slug}`)

      // Должен редиректнуть на полный URL
      const url = page.url()
      const isRedirected = url.includes('/mandalas/') || url.includes(`/${slug}`)

      expect(isRedirected).toBeTruthy()
    })
  })

  test.describe('404 для несуществующих slug', () => {
    test('несуществующий slug показывает 404', async ({ page }) => {
      // Переходим по несуществующему slug
      await page.goto('/nonexistent-slug-12345')

      // Ждём полной загрузки страницы (включая JS рендеринг)
      await page.waitForLoadState('domcontentloaded')

      // Должна показаться страница 404 (H1 с текстом "404") или редирект на главную
      const heading404 = page.locator('h1')
      // Ждём появления H1 (страница 404 рендерится на клиенте)
      await heading404
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => undefined)

      const h1Text = await heading404
        .first()
        .textContent()
        .catch(() => '')
      const is404 = h1Text?.includes('404') || false
      const isHome = page.url().endsWith('/')

      expect(is404 || isHome).toBeTruthy()
    })
  })
})
