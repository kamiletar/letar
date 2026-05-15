import { expect, test } from '@playwright/test'

test.describe('Закладки', () => {
  test.beforeEach(async ({ page }) => {
    // Очищаем localStorage перед каждым тестом
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('можно добавить закладку на документе', async ({ page }) => {
    // Открываем Конституцию
    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')

    // Ждём загрузки контента (с большим таймаутом для гидратации)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    // Ищём кнопку закладки (первую на странице)
    const bookmarkButton = page.locator('[aria-label="Добавить в закладки"]').first()

    // Проверяем, что кнопка видна
    await expect(bookmarkButton).toBeVisible()

    // Кликаем для добавления
    await bookmarkButton.click()

    // Проверяем, что aria-label изменился
    await expect(page.locator('[aria-label="Удалить из закладок"]').first()).toBeVisible()
  })

  test('закладки сохраняются в localStorage', async ({ page }) => {
    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    // Добавляем закладку
    const bookmarkButton = page.locator('[aria-label="Добавить в закладки"]').first()
    await bookmarkButton.click()

    // Ждём пока UI обновится (появится кнопка "Удалить")
    await expect(page.locator('[aria-label="Удалить из закладок"]').first()).toBeVisible()

    // Проверяем localStorage
    const bookmarks = await page.evaluate(() => {
      const data = localStorage.getItem('pravda-bookmarks')
      return data ? JSON.parse(data) : []
    })

    expect(bookmarks.length).toBeGreaterThan(0)
  })

  test('переход на страницу закладок', async ({ page }) => {
    await page.goto('/')

    // Кликаем на кнопку закладок в header
    await page.click('[aria-label="Закладки"]')

    // Проверяем URL (с или без trailing slash)
    await expect(page).toHaveURL(/\/bookmarks\/?$/)
  })

  test('закладки отображаются на странице /bookmarks', async ({ page }) => {
    // Сначала добавляем закладку
    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    const bookmarkButton = page.locator('[aria-label="Добавить в закладки"]').first()
    await bookmarkButton.click()

    // Ждём пока закладка сохранится
    await expect(page.locator('[aria-label="Удалить из закладок"]').first()).toBeVisible()

    // Проверяем что закладка сохранилась в localStorage
    const savedBookmarks = await page.evaluate(() => {
      const data = localStorage.getItem('pravda-bookmarks')
      return data ? JSON.parse(data) : []
    })
    expect(savedBookmarks.length).toBeGreaterThan(0)

    // Переходим на страницу закладок
    await page.goto('/bookmarks/')
    await page.waitForLoadState('domcontentloaded')

    // Ждём загрузки (страница рендерится клиентом после гидратации)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

    // Ждём пока закладки загрузятся из localStorage и отобразятся
    await page.waitForTimeout(1000)

    // Проверяем что есть хотя бы один элемент закладки
    // На странице должен быть текст "Статья" внутри карточки закладки
    await expect(page.getByText(/Статья \d+/)).toBeVisible({ timeout: 10000 })
  })

  test('можно удалить закладку со страницы закладок', async ({ page }) => {
    // Добавляем закладку
    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    const addButton = page.locator('[aria-label="Добавить в закладки"]').first()
    await addButton.click()

    // Ждём пока закладка добавится
    await expect(page.locator('[aria-label="Удалить из закладок"]').first()).toBeVisible()

    // Переходим на страницу закладок
    await page.goto('/bookmarks/')

    // Ждём загрузки страницы (гидратации)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

    // Удаляем закладку
    const removeButton = page.locator('[aria-label="Удалить закладку"]').first()
    await removeButton.click()

    // Проверяем что закладок больше нет
    const bookmarks = await page.evaluate(() => {
      const data = localStorage.getItem('pravda-bookmarks')
      return data ? JSON.parse(data) : []
    })

    expect(bookmarks).toHaveLength(0)
  })

  test('закладки восстанавливаются после перезагрузки', async ({ page }) => {
    // Добавляем закладку
    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    const bookmarkButton = page.locator('[aria-label="Добавить в закладки"]').first()
    await bookmarkButton.click()

    // Перезагружаем страницу
    await page.reload()

    // Проверяем что закладка всё ещё активна
    await expect(page.locator('[aria-label="Удалить из закладок"]').first()).toBeVisible()
  })
})
