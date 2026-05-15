import { expect, test } from '@playwright/test'

test.describe('Документы', () => {
  test('страница Конституции загружается', async ({ page }) => {
    await page.goto('/constitution')

    // Заголовок страницы
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Русская Правда загружается', async ({ page }) => {
    await page.goto('/pravda')

    await expect(page.locator('h1')).toBeVisible()
  })

  test('Table of Contents отображается на десктопе', async ({ page, viewport: _viewport }) => {
    // Устанавливаем большой viewport для десктопа
    await page.setViewportSize({ width: 1400, height: 900 })

    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    // TOC отображается на xl экранах
    const toc = page.locator('nav[aria-label="Содержание документа"]')
    await expect(toc).toBeVisible()
  })

  test('TOC содержит ссылки на разделы', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')

    // Находим TOC
    const toc = page.locator('nav[aria-label="Содержание документа"]')
    await expect(toc).toBeVisible({ timeout: 10000 })

    // Проверяем что есть ссылки
    const tocLinks = toc.locator('a')
    const count = await tocLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  test('клик по TOC прокручивает к разделу', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')

    // Находим первую ссылку в TOC
    const tocLink = page.locator('nav[aria-label="Содержание документа"] a').first()
    await expect(tocLink).toBeVisible({ timeout: 10000 })

    // Получаем href ссылки
    const href = await tocLink.getAttribute('href')

    // Кликаем
    await tocLink.click()

    // Проверяем что URL обновился
    await expect(page).toHaveURL(new RegExp(href!.replace('#', '.*#')))
  })

  test('страница кодекса загружается', async ({ page }) => {
    await page.goto('/codes/criminal')

    await expect(page.locator('h1')).toBeVisible()
  })

  test('страница устава загружается', async ({ page }) => {
    await page.goto('/statutes/church')

    await expect(page.locator('h1')).toBeVisible()
  })

  test('страница регламента загружается', async ({ page }) => {
    await page.goto('/regulations/duel')

    await expect(page.locator('h1')).toBeVisible()
  })

  test('BookmarkButton присутствует на странице документа', async ({ page }) => {
    await page.goto('/constitution')
    await expect(page.locator('h1')).toBeVisible()

    // Кнопка закладки должна быть на странице
    const bookmarkButton = page.locator('[aria-label="Добавить в закладки"]').first()
    await expect(bookmarkButton).toBeVisible()
  })

  test('прогресс чтения отображается в TOC', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')

    // Находим индикатор прогресса
    const progressBar = page.locator('nav[aria-label="Содержание документа"] [role="progressbar"]')
    await expect(progressBar).toBeVisible({ timeout: 10000 })

    // Проверяем начальное значение
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  })

  test('прогресс чтения обновляется при прокрутке', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    await page.goto('/constitution/')
    await page.waitForLoadState('domcontentloaded')

    // Прокручиваем страницу вниз
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })

    // Ждём обновления прогресса
    await page.waitForTimeout(200)

    // Проверяем что прогресс больше 0
    const progressBar = page.locator('nav[aria-label="Содержание документа"] [role="progressbar"]')
    const value = await progressBar.getAttribute('aria-valuenow')
    expect(Number(value)).toBeGreaterThan(0)
  })
})
