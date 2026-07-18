/**
 * Публичные страницы — доступны без авторизации.
 * `storageState: undefined` — явно без cookies (иначе браузер унаследует storageState
 * первого проекта Playwright, см. e2e-testing.md "Тесты на неавторизованный редирект").
 */

import { expect, test } from './fixtures/base-test'

test.describe('Главная страница', () => {
  test.use({ storageState: undefined })

  test('hero-секция загружается', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Animatrona', exact: true })).toBeVisible()
    await expect(page.getByText('Децентрализованная платформа для просмотра аниме через IPFS')).toBeVisible()
  })
})

test.describe('Каталог аниме', () => {
  test.use({ storageState: undefined })

  test('страница каталога загружается', async ({ page }) => {
    await page.goto('/anime')
    await expect(page.getByRole('heading', { name: 'Каталог аниме' })).toBeVisible()
    // Счётчик "Найдено: N аниме" отображается дважды (десктоп/мобильная раскладка) — .first() снимает strict-mode
    await expect(page.getByText('Найдено:').first()).toBeVisible()
  })

  test('несуществующее аниме — 404', async ({ page }) => {
    // Не проверяем HTTP-статус: notFound() в динамическом роуте под `next dev` (Turbopack, стриминг)
    // не всегда успевает выставить 404-заголовок до начала ответа — известный нюанс dev-режима,
    // сам UI при этом рендерится корректно. Проверяем контент, а не код ответа.
    await page.goto('/anime/nonexistent-anime-id-e2e')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByText('Страница не найдена')).toBeVisible()
  })
})

test.describe('Sign-in', () => {
  test.use({ storageState: undefined })

  test('кнопка входа через Ключницу видна', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Animatrona' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти через Ключницу' })).toBeVisible()
  })
})

test.describe('Sign-up', () => {
  test.use({ storageState: undefined })

  test('форма регистрации видна', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.getByPlaceholder('Email')).toBeVisible()
    await expect(page.getByPlaceholder('Пароль (минимум 8 символов)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Продолжить с Google/i })).toBeVisible()
  })
})

test.describe('RSS-фид', () => {
  test.use({ storageState: undefined })

  test('GET /api/rss/feed.xml отдаёт валидный XML', async ({ request }) => {
    const response = await request.get('/api/rss/feed.xml')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('xml')
    const body = await response.text()
    expect(body).toContain('<rss')
  })
})

test.describe('Защищённые публичные страницы — редирект неавторизованных', () => {
  test.use({ storageState: undefined })

  test('/leaderboard редиректит на /sign-in', async ({ page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/sign-in/)
  })

  test('/profile редиректит на /sign-in', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/sign-in/)
  })
})
