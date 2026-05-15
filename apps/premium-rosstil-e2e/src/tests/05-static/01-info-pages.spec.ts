/**
 * Тесты статических информационных страниц
 *
 * Тестируем:
 * - Главная страница /
 * - О бренде /about
 * - Контакты /contacts
 * - Доставка /delivery
 * - Как купить /how-to-buy
 * - Реквизиты /requisites
 * - Калькулятор размеров /size-calculator
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../../config/i18n'

test.describe('05-static: Информационные страницы', () => {
  // === Главная страница ===
  test.describe('Главная страница /', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/'))
      await expect(page).toHaveURL(/\/ru\/$/)
    })

    test('навигация в каталог отображается', async ({ page }) => {
      await page.goto(localePath('/'))
      const navCatalog = page.getByRole('link', { name: /каталог/i }).first()
      await expect(navCatalog).toBeVisible()
    })

    test('навигация "О бренде" отображается', async ({ page }) => {
      await page.goto(localePath('/'))
      const navAbout = page.getByRole('link', { name: /о бренде/i }).first()
      await expect(navAbout).toBeVisible()
    })

    test('навигация "Контакты" отображается', async ({ page }) => {
      await page.goto(localePath('/'))
      const navContacts = page.getByRole('link', { name: /контакты/i }).first()
      await expect(navContacts).toBeVisible()
    })

    test('футер отображается', async ({ page }) => {
      await page.goto(localePath('/'))
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
    })

    test('клик на "Каталог" переходит в каталог', async ({ page }) => {
      await page.goto(localePath('/'))
      await page
        .getByRole('link', { name: /каталог/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/catalog/i)
    })
  })

  // === О бренде ===
  test.describe('О бренде /about', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/about'))
      await expect(page).toHaveURL(/\/ru\/about/i)
    })

    test('страница содержит контент', async ({ page }) => {
      await page.goto(localePath('/about'))
      // Проверяем, что страница не пустая - используем toContainText для web-first assertion
      await expect(page.locator('body')).toContainText(/./s, { timeout: 5000 })
    })
  })

  // === Контакты ===
  test.describe('Контакты /contacts', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/contacts'))
      await expect(page).toHaveURL(/\/ru\/contacts/i)
    })

    test('страница содержит контент', async ({ page }) => {
      await page.goto(localePath('/contacts'))
      await expect(page.locator('body')).toContainText(/./s, { timeout: 5000 })
    })
  })

  // === Доставка ===
  test.describe('Доставка /delivery', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/delivery'))
      await expect(page).toHaveURL(/\/ru\/delivery/i)
    })

    test('страница содержит контент', async ({ page }) => {
      await page.goto(localePath('/delivery'))
      await expect(page.locator('body')).toContainText(/./s, { timeout: 5000 })
    })
  })

  // === Как купить ===
  test.describe('Как купить /how-to-buy', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/how-to-buy'))
      await expect(page).toHaveURL(/\/ru\/how-to-buy/i)
    })

    test('страница содержит контент', async ({ page }) => {
      await page.goto(localePath('/how-to-buy'))
      await expect(page.locator('body')).toContainText(/./s, { timeout: 5000 })
    })
  })

  // === Реквизиты ===
  test.describe('Реквизиты /requisites', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/requisites'))
      await expect(page).toHaveURL(/\/ru\/requisites/i)
    })

    test('страница содержит контент', async ({ page }) => {
      await page.goto(localePath('/requisites'))
      await expect(page.locator('body')).toContainText(/./s, { timeout: 5000 })
    })
  })

  // === Калькулятор размеров ===
  test.describe('Калькулятор размеров /size-calculator', () => {
    test('страница загружается', async ({ page }) => {
      await page.goto(localePath('/size-calculator'))
      await expect(page).toHaveURL(/\/ru\/size-calculator/i)
    })

    test('страница содержит форму или контент о размерах', async ({ page }) => {
      await page.goto(localePath('/size-calculator'))
      // Должен содержать слово о размерах или мерках
      await expect(page.locator('body')).toContainText(/размер|мерк|грудь|талия|бёдр/i, { timeout: 5000 })
    })
  })

  // === Навигация между страницами ===
  test.describe('Навигация', () => {
    test('можно перейти с главной на страницу "О бренде"', async ({ page }) => {
      await page.goto(localePath('/'))
      await page
        .getByRole('link', { name: /о бренде/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/about/i)
    })

    test('можно перейти с главной на страницу "Контакты"', async ({ page }) => {
      await page.goto(localePath('/'))
      await page
        .getByRole('link', { name: /контакты/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/contacts/i)
    })
  })
})
