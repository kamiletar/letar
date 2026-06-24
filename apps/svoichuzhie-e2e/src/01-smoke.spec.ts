import { expect, test } from '@playwright/test'

test.describe('01 — Smoke: основные страницы', () => {
  test('главная страница загружается, есть навигация', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Свои Чужие/i)
    // Логотип / заголовок
    await expect(page.locator('header')).toBeVisible()
  })

  test('страница /merch — список товаров', async ({ page }) => {
    await page.goto('/merch')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('страница /listen — плеер / музыка', async ({ page }) => {
    await page.goto('/listen')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('страница /events — афиша', async ({ page }) => {
    await page.goto('/events')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('страница /fanclub — информация о фан-клубе', async ({ page }) => {
    await page.goto('/fanclub')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('form:has(#join-email)')).toBeVisible()
  })

  test('footer — ссылки на правовые страницы', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    // Хотя бы одна из правовых ссылок
    const privacyLink = page.locator('a[href="/privacy"], a[href*="privacy"]')
    const offerLink = page.locator('a[href="/offer"], a[href*="offer"]')
    const anyLegal = privacyLink.or(offerLink)
    await expect(anyLegal.first()).toBeVisible()
  })

  test('404 — не найденная страница отображается корректно', async ({ page }) => {
    const response = await page.goto('/несуществующая-страница-e2e')
    // Next.js возвращает 404 для несуществующих страниц
    expect(response?.status()).toBe(404)
  })
})
