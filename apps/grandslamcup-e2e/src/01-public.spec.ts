/**
 * Публичные страницы — доступны без авторизации
 */

import { expect, test } from './fixtures/base-test'

/** СПб — используется во всех тестах, которым нужен конкретный город (см. nav-config.ts CITY_LABELS) */
const CITY = 'spb'

test.describe('Главная страница (city-selector)', () => {
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
})

test.describe('Дашборд города', () => {
  // `/` — city-selector (выбор города), не дашборд: секции ниже живут только на `/[citySlug]`
  // (apps/grandslamcup/src/app/(public)/[citySlug]/page.tsx) — навигация на конкретный город
  // обязательна перед проверкой.
  test('секция "Ближайшие матчи" отображается', async ({ page }) => {
    await page.goto(`/${CITY}`)
    await expect(page.getByRole('heading', { name: /Ближайшие матчи/i })).toBeVisible()
  })

  test('секция "Таблица" отображается', async ({ page }) => {
    await page.goto(`/${CITY}`)
    await expect(page.getByText(/Таблица —/)).toBeVisible()
  })

  test('секция "Последние результаты" отображается', async ({ page }) => {
    await page.goto(`/${CITY}`)
    await expect(page.getByRole('heading', { name: /Последние результаты/i })).toBeVisible()
  })
})

test.describe('Навигация', () => {
  // buildNavItems(citySlug, isHome) возвращает [] на root `/` (city-selector не имеет меню,
  // см. nav-config.ts) — меню появляется только внутри конкретного города.
  test('основные пункты меню доступны', async ({ page }) => {
    await page.goto(`/${CITY}`)

    const navItems = ['Таблица', 'Расписание', 'Команды', 'Поэты', 'Стадионы']
    for (const item of navItems) {
      await expect(page.getByRole('link', { name: item }).first()).toBeVisible()
    }
  })

  test('переход на Расписание', async ({ page }) => {
    await page.goto(`/${CITY}`)
    await page.getByRole('link', { name: 'Расписание' }).click()
    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.getByRole('heading', { name: /Расписание/i })).toBeVisible()
  })

  // Команды/Поэты/Стадионы ниже — глобальные страницы (apps/grandslamcup/src/app/(public)/teams,
  // players, venues — без city-фильтра), не city-scoped роуты. Навигация на конкретный город
  // им не нужна — это отдельный, намеренно глобальный список по всем городам сразу.
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
