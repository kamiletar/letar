import { expect, test } from '@playwright/test'

test.describe('Навигация', () => {
  test('главная страница загружается с правильным заголовком', async ({ page }) => {
    await page.goto('/')

    // Проверяем h1
    await expect(page.locator('h1')).toHaveText('Свод законов Руси')
  })

  test('отображается Header с логотипом', async ({ page }) => {
    await page.goto('/')

    // Header с ролью banner
    await expect(page.locator('header')).toBeVisible()

    // Логотип ведёт на главную
    const logo = page.locator('header a[href="/"]').first()
    await expect(logo).toBeVisible()
  })

  test('отображаются категории документов на главной', async ({ page }) => {
    await page.goto('/')

    // Основные законы
    await expect(page.getByRole('heading', { name: 'Основные законы' })).toBeVisible()

    // Кодексы
    await expect(page.getByRole('heading', { name: 'Кодексы' })).toBeVisible()

    // Уставы
    await expect(page.getByRole('heading', { name: 'Уставы' })).toBeVisible()

    // Регламенты
    await expect(page.getByRole('heading', { name: 'Регламенты' })).toBeVisible()
  })

  test('переход на страницу Конституции', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Кликаем на карточку Конституции (ссылка в основном контенте, не в сайдбаре)
    // Static export использует trailing slashes
    const constitutionCard = page.locator('a[href="/constitution/"]').first()
    await constitutionCard.click()

    // Ждём навигации (с или без trailing slash)
    await expect(page).toHaveURL(/\/constitution\/?$/)

    // Проверяем что страница загрузилась
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
  })

  test('переход на страницу кодексов через "Все кодексы"', async ({ page }) => {
    await page.goto('/')

    // Кликаем на ссылку
    await page.click('text=/Все кодексы/')

    // Проверяем URL (с или без trailing slash)
    await expect(page).toHaveURL(/\/codes\/?$/)
  })

  test('переход на страницу уставов через "Все уставы"', async ({ page }) => {
    await page.goto('/')

    await page.click('text=/Все уставы/')

    await expect(page).toHaveURL(/\/statutes\/?$/)
  })

  test('переход на страницу регламентов через "Все регламенты"', async ({ page }) => {
    await page.goto('/')

    await page.click('text=/Все регламенты/')

    await expect(page).toHaveURL(/\/regulations\/?$/)
  })

  test('Footer отображается на главной', async ({ page }) => {
    await page.goto('/')

    // Footer должен быть на странице
    await expect(page.locator('footer')).toBeVisible()
  })
})

test.describe('Клиентская навигация (RSC)', () => {
  /**
   * Тест проверяет, что при клике на ссылку в sidebar
   * контент страницы обновляется (не только URL).
   *
   * Это регрессионный тест для бага Next.js 16 с RSC payload'ами:
   * @see https://github.com/vercel/next.js/issues/85374
   */
  test('навигация из Налогового кодекса в Семейный обновляет контент', async ({ page }) => {
    // Начинаем с Налогового кодекса
    await page.goto('/codes/tax/')
    await page.waitForLoadState('domcontentloaded')

    // Проверяем начальный контент
    await expect(page.locator('h1')).toContainText('Налоговый кодекс', { ignoreCase: true })

    // Кликаем на Семейный кодекс в sidebar
    const familyLink = page.locator('nav a[href="/codes/family/"]').first()
    await familyLink.click()

    // Ждём навигации
    await expect(page).toHaveURL(/\/codes\/family\/?$/)
    await page.waitForLoadState('domcontentloaded')

    // Проверяем что контент изменился (не только URL!)
    await expect(page.locator('h1')).toContainText('Семейный кодекс', { ignoreCase: true })
  })

  test('навигация из Семейного кодекса в Трудовой обновляет контент', async ({ page }) => {
    await page.goto('/codes/family/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1')).toContainText('Семейный кодекс', { ignoreCase: true })

    const laborLink = page.locator('nav a[href="/codes/labor/"]').first()
    await laborLink.click()

    await expect(page).toHaveURL(/\/codes\/labor\/?$/)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1')).toContainText('Трудовой кодекс', { ignoreCase: true })
  })

  test('навигация между разными категориями (кодексы -> уставы)', async ({ page }) => {
    await page.goto('/codes/tax/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1')).toContainText('Налоговый кодекс', { ignoreCase: true })

    // Переходим в категорию Уставы
    const militaryLink = page.locator('nav a[href="/statutes/military/"]').first()
    await militaryLink.click()

    await expect(page).toHaveURL(/\/statutes\/military\/?$/)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1')).toContainText('Воинский устав', { ignoreCase: true })
  })

  test('множественные последовательные навигации работают корректно', async ({ page }) => {
    await page.goto('/codes/tax/')
    await page.waitForLoadState('domcontentloaded')

    // Навигация 1: Tax -> Family
    await page.locator('nav a[href="/codes/family/"]').first().click()
    await expect(page).toHaveURL(/\/codes\/family\/?$/)
    await expect(page.locator('h1')).toContainText('Семейный кодекс', { ignoreCase: true })

    // Навигация 2: Family -> Labor
    await page.locator('nav a[href="/codes/labor/"]').first().click()
    await expect(page).toHaveURL(/\/codes\/labor\/?$/)
    await expect(page.locator('h1')).toContainText('Трудовой кодекс', { ignoreCase: true })

    // Навигация 3: Labor -> Digital
    await page.locator('nav a[href="/codes/digital/"]').first().click()
    await expect(page).toHaveURL(/\/codes\/digital\/?$/)
    await expect(page.locator('h1')).toContainText('Цифровой кодекс', { ignoreCase: true })
  })

  test('browser history работает после клиентской навигации', async ({ page }) => {
    await page.goto('/codes/tax/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toContainText('Налоговый кодекс', { ignoreCase: true })

    // Навигация на Семейный кодекс
    await page.locator('nav a[href="/codes/family/"]').first().click()
    await expect(page).toHaveURL(/\/codes\/family\/?$/)
    await expect(page.locator('h1')).toContainText('Семейный кодекс', { ignoreCase: true })

    // Нажимаем кнопку "Назад" в браузере
    await page.goBack()
    await expect(page).toHaveURL(/\/codes\/tax\/?$/)
    await expect(page.locator('h1')).toContainText('Налоговый кодекс', { ignoreCase: true })

    // Нажимаем кнопку "Вперёд"
    await page.goForward()
    await expect(page).toHaveURL(/\/codes\/family\/?$/)
    await expect(page.locator('h1')).toContainText('Семейный кодекс', { ignoreCase: true })
  })
})
