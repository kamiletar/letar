/**
 * Dev тесты для Anime Detail Page
 *
 * Тестируют страницу деталей аниме:
 * - Навигация с главной страницы библиотеки
 * - Табы (Эпизоды, О сериале, Связанные, Видео)
 * - Hero section
 *
 * ВАЖНО: Эти тесты требуют хотя бы одно аниме в БД.
 * При пустой библиотеке тесты будут пропущены.
 */

import { expect, test } from '@playwright/test'

/** localStorage ключ для отключения Welcome диалога */
const WELCOME_SHOWN_KEY = 'animatrona-welcome-shown'

/**
 * Отключить Welcome диалог перед навигацией.
 */
async function disableWelcomeDialog(page: import('@playwright/test').Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true')
  }, WELCOME_SHOWN_KEY)
}

test.describe('Anime Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
  })

  test('клик на карточку открывает страницу деталей', async ({ page }) => {
    await page.goto('/library')

    // Ждём загрузки библиотеки
    await page.waitForTimeout(1000)

    // Проверяем есть ли аниме в библиотеке
    // Карточки аниме — это clickable элементы в сетке
    const animeCards = page.locator('a[href^="/library/"]').filter({
      has: page.locator('img'), // Карточки содержат изображение постера
    })

    const cardCount = await animeCards.count()

    if (cardCount === 0) {
      // Библиотека пуста — пропускаем тест
      test.skip()
      return
    }

    // Кликаем на первую карточку
    await animeCards.first().click()

    // URL должен измениться на /library/[id]
    await expect(page).toHaveURL(/\/library\/[\w-]+/, { timeout: 5000 })

    // Страница деталей должна загрузиться
    // Проверяем наличие кнопки "Назад к библиотеке"
    const backButton = page.getByRole('button', { name: /назад к библиотеке/i })
    await expect(backButton).toBeVisible({ timeout: 5000 })
  })

  test('страница деталей отображает Hero section', async ({ page }) => {
    await page.goto('/library')
    await page.waitForTimeout(1000)

    // Находим первую карточку
    const animeCards = page.locator('a[href^="/library/"]').filter({
      has: page.locator('img'),
    })

    if ((await animeCards.count()) === 0) {
      test.skip()
      return
    }

    await animeCards.first().click()
    await expect(page).toHaveURL(/\/library\/[\w-]+/, { timeout: 5000 })

    // Hero section содержит информацию об аниме
    // Проверяем наличие основных элементов

    // Название аниме (в Header или Hero) - может быть несколько banner elements
    const header = page.getByRole('banner')
    await expect(header.first()).toBeVisible({ timeout: 5000 })

    // Кнопка действий (меню)
    const actionMenu = page.getByRole('button', { name: /действия|меню|⋮/i })
    const hasActionMenu = await actionMenu.isVisible().catch(() => false)

    // Либо меню, либо отдельные кнопки
    if (!hasActionMenu) {
      // Может быть inline кнопки (редактировать, экспорт, удалить)
      const editButton = page.getByRole('button', { name: /редактировать|edit/i })
      const hasEditButton = await editButton.isVisible().catch(() => false)
      expect(hasEditButton || hasActionMenu).toBe(true)
    }
  })

  test('табы отображаются на странице деталей', async ({ page }) => {
    await page.goto('/library')
    await page.waitForTimeout(1000)

    const animeCards = page.locator('a[href^="/library/"]').filter({
      has: page.locator('img'),
    })

    if ((await animeCards.count()) === 0) {
      test.skip()
      return
    }

    await animeCards.first().click()
    await expect(page).toHaveURL(/\/library\/[\w-]+/, { timeout: 5000 })

    // Табы: Эпизоды, О сериале, Связанные
    const episodesTab = page.getByRole('tab', { name: /эпизоды/i })
    const aboutTab = page.getByRole('tab', { name: /о сериале/i })
    const relatedTab = page.getByRole('tab', { name: /связанные/i })

    await expect(episodesTab).toBeVisible({ timeout: 5000 })
    await expect(aboutTab).toBeVisible({ timeout: 5000 })
    await expect(relatedTab).toBeVisible({ timeout: 5000 })
  })

  test('навигация по табам работает', async ({ page }) => {
    await page.goto('/library')
    await page.waitForTimeout(1000)

    const animeCards = page.locator('a[href^="/library/"]').filter({
      has: page.locator('img'),
    })

    if ((await animeCards.count()) === 0) {
      test.skip()
      return
    }

    await animeCards.first().click()
    await expect(page).toHaveURL(/\/library\/[\w-]+/, { timeout: 5000 })

    // По умолчанию активен таб "Эпизоды"
    const episodesTab = page.getByRole('tab', { name: /эпизоды/i })
    await expect(episodesTab).toHaveAttribute('aria-selected', 'true')

    // Кликаем на "О сериале"
    const aboutTab = page.getByRole('tab', { name: /о сериале/i })
    await aboutTab.click()

    // Теперь активен таб "О сериале"
    await expect(aboutTab).toHaveAttribute('aria-selected', 'true')

    // Контент таба загрузился (табпанель)
    const tabPanel = page.getByRole('tabpanel')
    await expect(tabPanel).toBeVisible({ timeout: 3000 })

    // Кликаем на "Связанные"
    const relatedTab = page.getByRole('tab', { name: /связанные/i })
    await relatedTab.click()
    await expect(relatedTab).toHaveAttribute('aria-selected', 'true')
  })

  test('кнопка назад возвращает в библиотеку', async ({ page }) => {
    await page.goto('/library')
    await page.waitForTimeout(1000)

    const animeCards = page.locator('a[href^="/library/"]').filter({
      has: page.locator('img'),
    })

    if ((await animeCards.count()) === 0) {
      test.skip()
      return
    }

    await animeCards.first().click()
    await expect(page).toHaveURL(/\/library\/[\w-]+/, { timeout: 5000 })

    // Кликаем на "Назад к библиотеке"
    const backButton = page.getByRole('button', { name: /назад к библиотеке/i })
    await backButton.click()

    // URL должен вернуться к /library
    await expect(page).toHaveURL(/\/library$/, { timeout: 5000 })
  })
})

test.describe('Anime Detail - Direct Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
  })

  test('прямой переход на несуществующий ID показывает ошибку или редиректит', async ({ page }) => {
    // Переходим на несуществующий ID
    await page.goto('/library/non-existent-id-12345')
    await page.waitForTimeout(1000)

    // Возможные сценарии:
    // 1. Редирект на /library
    // 2. Показ "Не найдено"
    // 3. Кнопка возврата

    const currentUrl = page.url()
    const isRedirectedToLibrary = currentUrl.endsWith('/library') || !currentUrl.includes('non-existent')

    if (isRedirectedToLibrary) {
      // Редирект сработал — тест прошёл
      expect(true).toBe(true)
      return
    }

    // Иначе проверяем UI ошибки
    const notFoundText = page.getByText(/не найдено|not found|ошибка|error/i)
    const backButton = page.getByRole('button', { name: /вернуться|назад|back/i })
    const backLink = page.getByRole('link', { name: /библиотек/i })

    const hasNotFound = await notFoundText
      .first()
      .isVisible()
      .catch(() => false)
    const hasBackButton = await backButton
      .first()
      .isVisible()
      .catch(() => false)
    const hasBackLink = await backLink
      .first()
      .isVisible()
      .catch(() => false)

    // Хотя бы один элемент должен быть виден
    expect(hasNotFound || hasBackButton || hasBackLink).toBe(true)
  })
})
