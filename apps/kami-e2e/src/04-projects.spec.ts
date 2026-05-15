import { expect, test } from '@playwright/test'

test.describe('Страница проектов', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/')
  })

  test('1.1 — страница загружается с заголовком', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Проекты/i })).toBeVisible()
  })

  test('1.2 — отображаются карточки проектов', async ({ page }) => {
    // Проверяем наличие проектов из сидов
    await expect(page.getByRole('heading', { name: /Premium Rosstil/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /IMOT/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible()
  })

  test('1.3 — отображаются технологии проектов', async ({ page }) => {
    // Проверяем бейджи технологий
    await expect(page.getByText('Next.js').first()).toBeVisible()
    await expect(page.getByText('React').first()).toBeVisible()
    await expect(page.getByText('TypeScript').first()).toBeVisible()
  })

  test('1.4 — отображаются Featured бейджи', async ({ page }) => {
    // Проверяем наличие Featured бейджей
    const featuredBadges = page.getByText('Featured')
    await expect(featuredBadges.first()).toBeVisible()
  })

  test('1.5 — кнопка Demo присутствует у проектов с демо', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Демо/i }).first()).toBeVisible()
  })

  test('1.6 — CTA кнопка ведёт на страницу найма', async ({ page }) => {
    await page.getByRole('link', { name: /Позвать на работу/i }).click()
    await expect(page).toHaveURL(/\/hire\//)
  })
})

test.describe('Projects page (English)', () => {
  test('2.1 — English version loads correctly', async ({ page }) => {
    await page.goto('/en/projects/')

    await expect(page.getByRole('heading', { name: /Projects/i })).toBeVisible()
  })

  test('2.2 — Project cards are visible in English', async ({ page }) => {
    await page.goto('/en/projects/')

    // Проекты должны отображаться
    await expect(page.getByRole('heading', { name: /Premium Rosstil/i })).toBeVisible()
  })

  test('2.3 — Demo button text is in English', async ({ page }) => {
    await page.goto('/en/projects/')

    await expect(page.getByRole('link', { name: /Demo/i }).first()).toBeVisible()
  })
})
