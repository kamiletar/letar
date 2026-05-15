import { expect, test } from '@playwright/test'

test.describe('Страница навыков', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/skills/')
  })

  test('1.1 — страница загружается с заголовком', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Навыки/i })).toBeVisible()
  })

  test('1.2 — отображаются категории навыков', async ({ page }) => {
    // Проверяем основные категории
    await expect(page.getByRole('heading', { name: /Frontend/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Backend/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Инструменты/i })).toBeVisible()
  })

  test('1.3 — отображаются навыки в категориях', async ({ page }) => {
    // Проверяем ключевые технологии
    await expect(page.getByText('React')).toBeVisible()
    await expect(page.getByText('Next.js')).toBeVisible()
    await expect(page.getByText('TypeScript')).toBeVisible()
    await expect(page.getByText('Node.js')).toBeVisible()
    await expect(page.getByText('PostgreSQL')).toBeVisible()
  })

  test('1.4 — отображаются бейджи уровней', async ({ page }) => {
    // Проверяем хотя бы один бейдж уровня
    await expect(page.getByText(/Эксперт|Продвинутый|Средний/i).first()).toBeVisible()
  })

  test('1.5 — CTA кнопки работают', async ({ page }) => {
    await page.getByRole('link', { name: /Позвать на работу/i }).click()
    await expect(page).toHaveURL(/\/hire\//)
  })
})

test.describe('Skills page (English)', () => {
  test('2.1 — English version loads correctly', async ({ page }) => {
    await page.goto('/en/skills/')

    await expect(page.getByRole('heading', { name: /Skills/i })).toBeVisible()
  })

  test('2.2 — English categories are visible', async ({ page }) => {
    await page.goto('/en/skills/')

    await expect(page.getByRole('heading', { name: /Frontend/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Backend/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Tools/i })).toBeVisible()
  })

  test('2.3 — English skill levels are shown', async ({ page }) => {
    await page.goto('/en/skills/')

    // Проверяем английские бейджи уровней
    await expect(page.getByText(/Expert|Advanced|Intermediate/i).first()).toBeVisible()
  })
})
