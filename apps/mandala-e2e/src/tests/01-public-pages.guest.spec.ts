/**
 * Тесты публичных страниц - доступны без авторизации
 *
 * Проверяем, что публичные страницы загружаются корректно
 */
import { expect, test } from '@playwright/test'

test.describe('Публичные страницы', () => {
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
    test('загружается без ошибок', async ({ page }) => {
      await page.goto('/')
      // Проверяем, что страница загрузилась
      await expect(page).toHaveURL('/')
      // Не должно быть редиректа на sign-in
      await expect(page).not.toHaveURL(/sign-in/)
    })

    test('содержит SEO заголовок', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveTitle(/Elfafeya Art/i)
    })

    test('отображает сетку мандал', async ({ page }) => {
      await page.goto('/')
      // HomeGrid использует CSS backgroundImage на section элементах
      // Проверяем, что grid с ячейками загрузился
      const gridSection = page.locator('section').first()
      await expect(gridSection).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Галерея мандал', () => {
    test('/mandalas загружается', async ({ page }) => {
      await page.goto('/mandalas')
      await expect(page).toHaveURL('/mandalas')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test('можно перейти к детальному просмотру мандалы', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Ждём загрузки страницы
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

      // Кликаем на первую мандалу
      const mandalaCard = page.locator('a[href^="/mandalas/"]').first()
      const hasMandalas = (await mandalaCard.count()) > 0

      if (!hasMandalas) {
        test.skip()
        return
      }

      await mandalaCard.click()
      await page.waitForURL(/\/mandalas\/.+/)
      // Проверяем, что загрузилась страница просмотра (canvas или img)
      const mandalaContent = page.locator('canvas, img').first()
      await expect(mandalaContent).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Магазин', () => {
    test('/shop загружается', async ({ page }) => {
      await page.goto('/shop')
      await expect(page).toHaveURL('/shop')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test('можно перейти к товару', async ({ page }) => {
      await page.goto('/shop')

      // Кликаем на первый товар
      const productCard = page.locator('a[href^="/shop/"]').first()
      const hasProducts = (await productCard.count()) > 0

      if (hasProducts) {
        await productCard.click()
        await page.waitForURL(/\/shop\/.+/)
        // Проверяем, что загрузилась страница товара
        await expect(page.locator('img').first()).toBeVisible()
      }
    })
  })

  test.describe('Страницы контента', () => {
    test('/about-elfafeya - О художнице', async ({ page }) => {
      await page.goto('/about-elfafeya')
      await expect(page).toHaveURL('/about-elfafeya')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test('/about-mandalas - О мандалах', async ({ page }) => {
      await page.goto('/about-mandalas')
      await expect(page).toHaveURL('/about-mandalas')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test('/contacts - Контакты', async ({ page }) => {
      await page.goto('/contacts')
      await expect(page).toHaveURL('/contacts')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })

  test.describe('Корзина', () => {
    test('/cart доступна без авторизации', async ({ page }) => {
      await page.goto('/cart')
      await expect(page).toHaveURL('/cart')
      // Проверяем, что не редиректит на sign-in
      await expect(page).not.toHaveURL(/sign-in/)
    })
  })

  test.describe('Авторизация', () => {
    test('/sign-in доступна', async ({ page }) => {
      await page.goto('/sign-in')
      await expect(page).toHaveURL('/sign-in')
      await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
    })

    test('/sign-up доступна', async ({ page }) => {
      await page.goto('/sign-up')
      await expect(page).toHaveURL('/sign-up')
    })
  })

  test.describe('Навигация на главной', () => {
    // Главная страница показывает WelcomePortal — модальное окно с навигационными ссылками
    // За порталом находятся CenteredPetal кнопки-лепестки
    test('WelcomePortal содержит навигационные ссылки', async ({ page }) => {
      await page.goto('/')

      // WelcomePortal показывает ссылки на галерею и другие страницы
      const galleryLink = page.locator('a[href="/mandalas"]').first()
      await expect(galleryLink).toBeVisible({ timeout: 10000 })
    })

    test('можно перейти на страницу мандал через WelcomePortal', async ({ page }) => {
      await page.goto('/')
      // Кликаем на ссылку "Галерея" внутри WelcomePortal
      const galleryLink = page.locator('a[href="/mandalas"]').first()
      await expect(galleryLink).toBeVisible({ timeout: 10000 })
      await galleryLink.click()
      // Ждём перехода
      await expect(page).toHaveURL(/\/mandalas/, { timeout: 15000 })
    })
  })

  test.describe('Навигация на внутренних страницах', () => {
    // На внутренних страницах отображается стандартный Header с Галерея/Магазин
    test('шапка содержит ссылки на галерею и магазин', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Ждём загрузки страницы — проверяем логотип (first() т.к. есть в header и footer)
      await expect(page.getByText('Elfafeya Art').first()).toBeVisible({ timeout: 10000 })

      // Ссылки навигации (display:none на мобилках, flex на md+)
      const galleryLink = page.locator('a[href="/mandalas"]', { hasText: 'Галерея' })
      const shopLink = page.locator('a[href="/shop"]', { hasText: 'Магазин' })

      await expect(galleryLink).toBeVisible()
      await expect(shopLink).toBeVisible()
    })

    test('можно перейти в магазин через навигацию', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)
      await expect(page.getByText('Elfafeya Art').first()).toBeVisible({ timeout: 10000 })
      await page.locator('a[href="/shop"]', { hasText: 'Магазин' }).click()
      await expect(page).toHaveURL(/\/shop/)
    })
  })
})
