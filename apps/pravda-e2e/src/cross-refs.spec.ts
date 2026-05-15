import { expect, test } from '@playwright/test'

test.describe('Перекрёстные ссылки (CrossRef)', () => {
  test('CrossRef компоненты отображаются на странице УПК', async ({ page }) => {
    await page.goto('/codes/criminal-procedure/')
    await expect(page.locator('h1')).toBeVisible()

    // Проверяем что есть текст "см." на странице (first, т.к. их несколько)
    const crossRefText = page.locator('text=см. Цифровой кодекс').first()
    await expect(crossRefText).toBeVisible()
  })

  test('CrossRef компоненты отображаются на странице Налогового кодекса', async ({ page }) => {
    await page.goto('/codes/tax/')
    await expect(page.locator('h1')).toBeVisible()

    // Проверяем что есть текст "см." на странице
    const crossRefText = page.locator('text=см. Церковный устав')
    await expect(crossRefText).toBeVisible()
  })

  test('CrossRef "см. также" отображается', async ({ page }) => {
    await page.goto('/codes/tax/')
    await expect(page.locator('h1')).toBeVisible()

    // Проверяем что есть текст "см. также" на странице
    const crossRefText = page.locator('text=см. также')
    await expect(crossRefText.first()).toBeVisible()
  })

  test('CrossRef ссылки кликабельные', async ({ page }) => {
    await page.goto('/codes/criminal-procedure/')
    await expect(page.locator('h1')).toBeVisible()

    // Находим ссылку на Цифровой кодекс
    const link = page.getByRole('link', { name: 'Цифровой кодекс' }).first()
    await expect(link).toBeVisible()

    // Проверяем что это ссылка
    await expect(link).toHaveAttribute('href', /codes\/digital/)
  })

  test('Внутренняя ссылка на статью работает', async ({ page }) => {
    await page.goto('/codes/criminal-procedure/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    // Находим ссылку на статью 72 (внутренняя ссылка)
    const link = page.locator('a[href="#article-72"]')
    await expect(link).toBeVisible({ timeout: 10000 })

    // Кликаем
    await link.click()

    // Проверяем что статья видна
    const article = page.locator('#article-72')
    await expect(article).toBeVisible()
  })

  test('Переход по CrossRef ссылке работает', async ({ page }) => {
    await page.goto('/codes/criminal-procedure/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

    // Находим первую ссылку на Цифровой кодекс
    const link = page.getByRole('link', { name: 'Цифровой кодекс' }).first()
    await link.click()

    // Проверяем переход
    await expect(page).toHaveURL(/\/codes\/digital/)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
  })
})
