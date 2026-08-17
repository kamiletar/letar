import { expect, test } from '@playwright/test'

test.describe('Навигация', () => {
  test('клик по "Возможности" в Navbar скроллит к секции #features без 404', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Navbar делает preventDefault + scrollIntoView (см. navbar.tsx: scrollToSection) —
    // URL сознательно не меняется, поэтому проверяем факт скролла, а не toHaveURL
    const nav = page.locator('nav').first()
    await nav.getByRole('link', { name: 'Возможности' }).click()

    await expect(page.locator('#features')).toBeInViewport()
  })

  test('клик по "FAQ" в Navbar скроллит к секции #faq без 404', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const nav = page.locator('nav').first()
    await nav.getByRole('link', { name: 'FAQ' }).click()

    await expect(page.locator('#faq')).toBeInViewport()
  })

  test('переход в документацию по ссылке "Документация" открывает /docs/quick-start', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const nav = page.locator('nav').first()
    await nav.getByRole('link', { name: 'Документация' }).click()

    // /docs редиректит на /docs/quick-start (см. src/app/docs/page.tsx); trailingSlash:true в next.config.js
    await expect(page).toHaveURL(/\/docs\/quick-start\/?$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Быстрый старт' })).toBeVisible()
  })

  test('прямой переход на /docs редиректит на /docs/quick-start', async ({ page }) => {
    const response = await page.goto('/docs')

    expect(response?.ok()).toBeTruthy()
    await expect(page).toHaveURL(/\/docs\/quick-start\/?$/, { timeout: 15000 })
  })

  test('навигация по сайдбару документации на "Горячие клавиши" без 404', async ({ page }) => {
    await page.goto('/docs/quick-start')
    await page.waitForLoadState('domcontentloaded')

    const sidebar = page.locator('nav').filter({ hasText: 'Документация' })
    await sidebar.getByRole('link', { name: 'Горячие клавиши' }).click()

    await expect(page).toHaveURL(/\/docs\/keyboard-shortcuts\/?$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Горячие клавиши')
  })

  test('ссылка "Вернуться на главную" из документации ведёт на "/"', async ({ page }) => {
    await page.goto('/docs/quick-start')

    await page.getByRole('link', { name: /Вернуться на главную/ }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Animatrona')
  })
})
