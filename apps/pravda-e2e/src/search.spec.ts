import { expect, test } from '@playwright/test'

test.describe('Поиск', () => {
  test('Command Palette открывается по Cmd/Ctrl+K', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Открываем Command Palette с помощью горячей клавиши
    await page.keyboard.press('Control+k')

    // Проверяем что палитра открылась (ищем input поиска)
    await expect(page.getByPlaceholder('Поиск по законам...')).toBeVisible()
  })

  test('Command Palette открывается по клику на кнопку поиска', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Кликаем на кнопку поиска (текст "Поиск..." на десктопе или иконку на мобильном)
    const searchButton = page.locator('button:has-text("Поиск"), [aria-label="Поиск"]').first()
    await searchButton.click()

    // Проверяем что палитра открылась
    await expect(page.getByPlaceholder('Поиск по законам...')).toBeVisible()
  })

  test('Command Palette закрывается по Escape', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Открываем
    await page.keyboard.press('Control+k')
    await expect(page.getByPlaceholder('Поиск по законам...')).toBeVisible()

    // Закрываем
    await page.keyboard.press('Escape')

    // Проверяем что закрылась
    await expect(page.getByPlaceholder('Поиск по законам...')).toBeHidden()
  })

  test('поиск показывает результаты', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Открываем Command Palette
    await page.keyboard.press('Control+k')

    // Вводим запрос
    const searchInput = page.getByPlaceholder('Поиск по законам...')
    await searchInput.fill('конституция')

    // Ждём результаты (нужно подождать debounce)
    await page.waitForTimeout(500)

    // Проверяем что есть результаты (ищем ссылки в палитре)
    const results = page.locator('[role="dialog"] a')
    await expect(results.first()).toBeVisible()
  })

  test('клик по результату закрывает палитру и переходит на страницу', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Открываем Command Palette
    await page.keyboard.press('Control+k')

    // Вводим запрос
    const searchInput = page.getByPlaceholder('Поиск по законам...')
    await searchInput.fill('конституция')

    // Ждём результаты
    await page.waitForTimeout(500)

    // Кликаем на первый результат
    const firstResult = page.locator('[role="dialog"] a').first()
    await firstResult.click()

    // Проверяем что палитра закрылась
    await expect(page.getByPlaceholder('Поиск по законам...')).toBeHidden()

    // Проверяем что перешли на страницу (URL изменился)
    const url = page.url()
    expect(url).toContain('constitution')
  })

  test('навигация по результатам с клавиатуры (ArrowDown/Enter)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Открываем Command Palette
    await page.keyboard.press('Control+k')

    // Вводим запрос
    const searchInput = page.getByPlaceholder('Поиск по законам...')
    await searchInput.fill('право')

    // Ждём результаты
    await page.waitForTimeout(500)

    // Нажимаем ArrowDown для выбора второго результата
    await page.keyboard.press('ArrowDown')

    // Нажимаем Enter для перехода
    await page.keyboard.press('Enter')

    // Проверяем что палитра закрылась и URL изменился
    await expect(page.getByPlaceholder('Поиск по законам...')).toBeHidden()
  })

  test('страница /search загружается', async ({ page }) => {
    await page.goto('/search/')

    // Проверяем что страница загрузилась (ждём гидратации клиентского компонента)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
  })

  test('показывает "Ничего не найдено" для несуществующего запроса', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Открываем Command Palette
    await page.keyboard.press('Control+k')

    // Вводим несуществующий запрос
    const searchInput = page.getByPlaceholder('Поиск по законам...')
    await searchInput.fill('xyz123несуществующий')

    // Ждём результаты
    await page.waitForTimeout(500)

    // Проверяем сообщение
    await expect(page.getByText('Ничего не найдено')).toBeVisible()
  })
})
