import { expect, test } from '@playwright/test'

test.describe('Страница блога', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog/')
  })

  test('1.1 — страница загружается с заголовком', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Блог/i })).toBeVisible()
  })

  test('1.2 — отображаются статьи блога', async ({ page }) => {
    // Проверяем наличие статьи из сидов
    await expect(page.getByRole('heading', { name: /hello-world/i })).toBeVisible()
  })

  test('1.3 — отображаются теги статей', async ({ page }) => {
    // Проверяем бейджи тегов
    await expect(page.getByText('blog').first()).toBeVisible()
  })

  test('1.4 — отображается дата публикации', async ({ page }) => {
    // Проверяем дату
    await expect(page.getByText(/2025/)).toBeVisible()
  })

  test('1.5 — Featured бейдж отображается', async ({ page }) => {
    await expect(page.getByText('Featured').first()).toBeVisible()
  })

  test('1.6 — клик по статье ведёт на страницу статьи', async ({ page }) => {
    await page.getByRole('heading', { name: /hello-world/i }).click()
    await expect(page).toHaveURL(/\/blog\/hello-world\//)
  })
})

test.describe('Страница статьи блога', () => {
  test('2.1 — статья загружается корректно', async ({ page }) => {
    await page.goto('/blog/hello-world/')

    await expect(page.getByRole('heading', { name: /hello-world/i })).toBeVisible()
  })

  test('2.2 — отображается описание статьи', async ({ page }) => {
    await page.goto('/blog/hello-world/')

    await expect(page.getByText(/Первая статья/i)).toBeVisible()
  })

  test('2.3 — отображается контент статьи', async ({ page }) => {
    await page.goto('/blog/hello-world/')

    // Проверяем что контент отрендерился
    await expect(page.getByText(/Добро пожаловать/i)).toBeVisible()
  })

  test('2.4 — кнопка "Назад к блогу" работает', async ({ page }) => {
    await page.goto('/blog/hello-world/')

    await page.getByRole('link', { name: /Назад к блогу/i }).click()
    await expect(page).toHaveURL(/\/blog\//)
  })
})

test.describe('Blog page (English)', () => {
  test('3.1 — English version loads correctly', async ({ page }) => {
    await page.goto('/en/blog/')

    await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible()
  })

  test('3.2 — English article title is shown', async ({ page }) => {
    await page.goto('/en/blog/')

    await expect(page.getByRole('heading', { name: /Hello World/i })).toBeVisible()
  })

  test('3.3 — English article page loads correctly', async ({ page }) => {
    await page.goto('/en/blog/hello-world/')

    await expect(page.getByRole('heading', { name: /Hello World/i })).toBeVisible()
    await expect(page.getByText(/First post/i)).toBeVisible()
  })

  test('3.4 — Back button text is in English', async ({ page }) => {
    await page.goto('/en/blog/hello-world/')

    await expect(page.getByRole('link', { name: /Back to blog/i })).toBeVisible()
  })
})
