import { expect, test } from '@playwright/test'

test.describe('08 — Мобильная навигация', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test('hamburger-кнопка видна на мобильном вьюпорте', async ({ page }) => {
    await page.goto('/')
    const hamburger = page.locator('button[aria-label="Открыть меню"]')
    await expect(hamburger).toBeVisible()
  })

  test('hamburger-кнопка скрыта на десктопном вьюпорте', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const hamburger = page.locator('button[aria-label="Открыть меню"]')
    await expect(hamburger).not.toBeVisible()
  })

  test('клик на hamburger открывает Drawer с навигацией', async ({ page }) => {
    await page.goto('/')
    const hamburger = page.locator('button[aria-label="Открыть меню"]')
    await hamburger.click()

    // Drawer в Portal — ищем глобально
    const drawerTitle = page.getByText('Навигация', { exact: true })
    await expect(drawerTitle).toBeVisible({ timeout: 5000 })

    // Основные разделы присутствуют
    await expect(page.getByRole('link', { name: 'Концерты' }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Музыка' }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Блог' }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Свои' }).last()).toBeVisible()
  })

  test('кнопка закрытия (×) закрывает Drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[aria-label="Открыть меню"]').click()

    const drawerTitle = page.getByText('Навигация', { exact: true })
    await expect(drawerTitle).toBeVisible({ timeout: 5000 })

    // CloseButton из Chakra имеет aria-label="Close"
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(drawerTitle).not.toBeVisible({ timeout: 5000 })
  })

  test('клик на ссылку внутри Drawer закрывает его и переходит на страницу', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[aria-label="Открыть меню"]').click()

    const drawerTitle = page.getByText('Навигация', { exact: true })
    await expect(drawerTitle).toBeVisible({ timeout: 5000 })

    // Кликаем на раздел Концерты в открытом Drawer
    await page.getByRole('link', { name: 'Концерты' }).last().click()
    await page.waitForURL(/\/events/, { timeout: 15_000 })

    // Drawer закрывается при переходе (pathname меняется → useEffect сбрасывает open)
    await expect(drawerTitle).not.toBeVisible({ timeout: 5000 })
  })

  test('неавторизованный пользователь видит кнопку "Войти" в Drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[aria-label="Открыть меню"]').click()
    await expect(page.getByText('Навигация', { exact: true })).toBeVisible({ timeout: 5000 })

    const loginLink = page.getByRole('link', { name: 'Войти', exact: true })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', /\/login/)
  })

  test('aria-expanded меняется при открытии/закрытии', async ({ page }) => {
    await page.goto('/')
    const hamburger = page.locator('button[aria-label="Открыть меню"]')

    // Закрытое состояние
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false')

    // Открываем
    await hamburger.click()
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true')
  })

  test('touch-цель hamburger не менее 44×44px', async ({ page }) => {
    await page.goto('/')
    const hamburger = page.locator('button[aria-label="Открыть меню"]')
    const box = await hamburger.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
