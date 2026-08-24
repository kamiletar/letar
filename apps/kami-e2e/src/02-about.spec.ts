import { expect, test } from '@playwright/test'

test.describe('Страница "О себе"', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about/')
  })

  test('1.1 — страница загружается с заголовком', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Обо мне/i })).toBeVisible()
  })

  test('1.2 — отображается intro текст', async ({ page }) => {
    await expect(page.getByText(/Архитектор ПО с фокусом на качество/i)).toBeVisible()
  })

  test('1.3 — отображаются статистики', async ({ page }) => {
    // Проверяем статистику
    await expect(page.getByText(/7\+/)).toBeVisible()
    await expect(page.getByText(/30\+/)).toBeVisible()
    await expect(page.getByText(/50\+/)).toBeVisible()

    // Проверяем подписи
    await expect(page.getByText(/лет опыта/i)).toBeVisible()
    await expect(page.getByText(/проектов/i)).toBeVisible()
    await expect(page.getByText(/технологий/i)).toBeVisible()
  })

  test('1.4 — отображаются карточки "Чем занимаюсь"', async ({ page }) => {
    await expect(page.getByText(/Чем занимаюсь/i)).toBeVisible()
    await expect(page.getByText(/Архитектура/i)).toBeVisible()
    await expect(page.getByText(/Разработка/i)).toBeVisible()
    await expect(page.getByText(/Менторинг/i)).toBeVisible()
  })

  test('1.5 — отображается технологический стек', async ({ page }) => {
    await expect(page.getByText(/Основной стек/i)).toBeVisible()
    await expect(page.getByText('React')).toBeVisible()
    await expect(page.getByText('Next.js')).toBeVisible()
    await expect(page.getByText('TypeScript')).toBeVisible()
  })

  test('1.6 — CTA кнопка ведёт на страницу навыков', async ({ page }) => {
    await page.getByRole('link', { name: /Посмотреть навыки/i }).click()

    await expect(page).toHaveURL(/\/skills\//)
  })
})

test.describe('Страница About (English)', () => {
  test('2.1 — English version loads correctly', async ({ page }) => {
    await page.goto('/en/about/')

    await expect(page.getByRole('heading', { name: /About Me/i })).toBeVisible()
    await expect(page.getByText(/Software Architect focused on quality/i)).toBeVisible()
  })

  test('2.2 — English stats are visible', async ({ page }) => {
    await page.goto('/en/about/')

    await expect(page.getByText(/years of experience/i)).toBeVisible()
    await expect(page.getByText(/projects/)).toBeVisible()
    await expect(page.getByText(/technologies/i)).toBeVisible()
  })
})
