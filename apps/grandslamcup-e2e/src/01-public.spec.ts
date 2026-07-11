/**
 * Публичные страницы — доступны без авторизации
 */

import { expect, test } from './fixtures/base-test'

test.describe('Главная страница', () => {
  test('загружается с заголовком', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Grand Slam Cup/i })).toBeVisible()
  })

  test('логотип виден в хедере', async ({ page }) => {
    await page.goto('/')
    // Логотип с одинаковым alt повторяется в header/footer/hero/mobile-drawer (одно и то же
    // изображение — это корректно для доступности) — тест именно про хедер, скоупим локатор,
    // иначе strict-mode violation (несколько совпадений на странице).
    await expect(page.locator('header').getByAltText('Grand Slam Cup')).toBeVisible()
  })

  test('секция "Ближайшие матчи" отображается', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Ближайшие матчи/i })).toBeVisible()
  })

  test('секция "Таблица" отображается', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Таблица —/)).toBeVisible()
  })

  test('секция "Последние результаты" отображается', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Последние результаты/i })).toBeVisible()
  })
})

test.describe('Навигация', () => {
  test('основные пункты меню доступны', async ({ page }) => {
    await page.goto('/')

    // Проверяем основные пункты навигации (desktop)
    const navItems = ['Таблица', 'Расписание', 'Команды', 'Поэты', 'Стадионы']
    for (const item of navItems) {
      await expect(page.getByRole('link', { name: item }).first()).toBeVisible()
    }
  })

  test('переход на Расписание', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Расписание' }).click()
    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.getByRole('heading', { name: /Расписание/i })).toBeVisible()
  })

  test('переход на Команды', async ({ page }) => {
    await page.goto('/teams')
    await expect(page.getByRole('heading', { name: /Команды/i })).toBeVisible()
  })

  test('переход на Поэты', async ({ page }) => {
    await page.goto('/players')
    await expect(page.getByRole('heading', { name: /Поэты|Рейтинг/i })).toBeVisible()
  })

  test('переход на Стадионы', async ({ page }) => {
    await page.goto('/venues')
    await expect(page.getByRole('heading', { name: /Стадионы|Площадки/i })).toBeVisible()
  })
})
