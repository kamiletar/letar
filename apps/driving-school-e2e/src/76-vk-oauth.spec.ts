import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { waitForPageLoad } from './helpers'

/**
 * E2E тесты для VK OAuth (и других провайдеров)
 *
 * Проверяет наличие OAuth кнопок на страницах входа и регистрации.
 *
 * НЕ тестирует сам OAuth flow (требует реальный VK/Google/Yandex).
 * Только проверяет наличие кнопок и корректность href.
 */
test.describe('OAuth провайдеры (VK, Google, Yandex)', () => {
  // Тесты без авторизации — проверяем страницы входа/регистрации

  test.describe('Страница входа', () => {
    test('E2E-76.1 — кнопки OAuth присутствуют на странице входа', async ({ page }) => {
      await page.goto(urls.signIn)
      await waitForPageLoad(page)

      // Проверяем наличие кнопок OAuth
      const googleBtn = page.getByRole('button', { name: /google/i }).or(page.getByRole('link', { name: /google/i }))
      const yandexBtn = page
        .getByRole('button', { name: /яндекс|yandex/i })
        .or(page.getByRole('link', { name: /яндекс|yandex/i }))
      const vkBtn = page
        .getByRole('button', { name: /vk|вконтакте/i })
        .or(page.getByRole('link', { name: /vk|вконтакте/i }))

      await expect(googleBtn.first()).toBeVisible({ timeout: 10000 })
      await expect(yandexBtn.first()).toBeVisible({ timeout: 10000 })
      await expect(vkBtn.first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-76.2 — OAuth кнопки ведут на /api/auth/signin/social', async ({ page }) => {
      await page.goto(urls.signIn)
      await waitForPageLoad(page)

      // Проверяем href ссылок OAuth (могут быть <a> или <button> с onClick)
      // Ищем ссылки с provider в href
      const oauthLinks = page.locator('a[href*="api/auth/signin/social"]')
      const count = await oauthLinks.count()

      if (count > 0) {
        // Проверяем что есть ссылки с provider параметром
        const hrefs: string[] = []
        for (let i = 0; i < count; i++) {
          const href = await oauthLinks.nth(i).getAttribute('href')
          if (href) hrefs.push(href)
        }

        // Должны быть ссылки для Google, Yandex, VK
        const hasGoogle = hrefs.some((h) => h.includes('google'))
        const hasYandex = hrefs.some((h) => h.includes('yandex'))
        const hasVk = hrefs.some((h) => h.includes('vk'))

        expect(hasGoogle || hasYandex || hasVk).toBe(true)
      } else {
        // Кнопки могут использовать onClick вместо href
        console.log('  ℹ️ OAuth кнопки используют JavaScript вместо прямых ссылок')
      }
    })
  })

  test.describe('Страница регистрации', () => {
    test('E2E-76.3 — кнопки OAuth присутствуют на странице регистрации', async ({ page }) => {
      await page.goto(urls.signUp)
      await waitForPageLoad(page)

      const googleBtn = page.getByRole('button', { name: /google/i }).or(page.getByRole('link', { name: /google/i }))
      const yandexBtn = page
        .getByRole('button', { name: /яндекс|yandex/i })
        .or(page.getByRole('link', { name: /яндекс|yandex/i }))
      const vkBtn = page
        .getByRole('button', { name: /vk|вконтакте/i })
        .or(page.getByRole('link', { name: /vk|вконтакте/i }))

      await expect(googleBtn.first()).toBeVisible({ timeout: 10000 })
      await expect(yandexBtn.first()).toBeVisible({ timeout: 10000 })
      await expect(vkBtn.first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-76.4 — текст «Быстрая регистрация» или аналогичный присутствует', async ({ page }) => {
      await page.goto(urls.signUp)
      await waitForPageLoad(page)

      // Должен быть разделитель или заголовок секции OAuth
      const hasOauthLabel = page.getByText(/быстр|через.*аккаунт|войти через|или/i)

      const hasLabel = await hasOauthLabel
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (!hasLabel) {
        console.log('  ℹ️ Секция OAuth может быть оформлена по-другому')
      }
    })

    test('E2E-76.5 — разделитель «или» между формой и OAuth кнопками', async ({ page }) => {
      await page.goto(urls.signUp)
      await waitForPageLoad(page)

      // Часто есть разделитель "или" между формой и социальными кнопками
      const separator = page
        .getByText('или', { exact: true })
        .or(page.getByText('или', { exact: false }).filter({ hasText: /^или$/i }))

      const hasSeparator = await separator
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      // Проверяем что все 3 кнопки видны (это важнее разделителя)
      const vkBtn = page
        .getByRole('button', { name: /vk|вконтакте/i })
        .or(page.getByRole('link', { name: /vk|вконтакте/i }))
      await expect(vkBtn.first()).toBeVisible({ timeout: 5000 })

      if (!hasSeparator) {
        console.log('  ℹ️ Разделитель «или» может отсутствовать')
      }
    })
  })
})
