/**
 * Тесты юридических страниц /legal/*
 *
 * Тестируем:
 * - Пользовательское соглашение /legal/terms
 * - Политика конфиденциальности /legal/privacy
 * - Публичная оферта /legal/offer
 * - Политика возврата /legal/returns
 * - Агентский договор /legal/seller-agreement
 * - Согласие на обработку ПД /legal/consent
 * - Навигация между страницами через layout
 * - Баннер «Проект документа»
 * - Ссылки из footer
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../../config/i18n'

const LEGAL_PAGES = [
  { path: '/legal/terms', title: /пользовательское соглашение/i, keyword: /регистрация|аккаунт|пользовател/i },
  { path: '/legal/privacy', title: /политика конфиденциальности/i, keyword: /персональн|данн|cookie/i },
  { path: '/legal/offer', title: /публичная оферта/i, keyword: /оператор|агент|продав/i },
  { path: '/legal/returns', title: /возврат/i, keyword: /возврат|обмен|7.*дней|дефект/i },
  { path: '/legal/seller-agreement', title: /агентский договор/i, keyword: /комисси|самозанят|продав/i },
  { path: '/legal/consent', title: /согласие.*обработк/i, keyword: /персональн|согласи|обработк/i },
] as const

test.describe('05-static: Юридические страницы /legal', () => {
  // === Доступность и загрузка всех страниц ===
  for (const { path, title, keyword } of LEGAL_PAGES) {
    test.describe(`${path}`, () => {
      test('страница загружается', async ({ page }) => {
        await page.goto(localePath(path))
        await expect(page).toHaveURL(new RegExp(`/ru${path.replace('/', '\\/')}`))
      })

      test('заголовок страницы присутствует', async ({ page }) => {
        await page.goto(localePath(path))
        await expect(page.locator('h1, h2').first()).toContainText(title, { timeout: 10000 })
      })

      test('содержит ключевой контент', async ({ page }) => {
        await page.goto(localePath(path))
        await expect(page.locator('body')).toContainText(keyword, { timeout: 10000 })
      })
    })
  }

  // === Баннер «Проект документа» ===
  test.describe('Баннер предупреждения', () => {
    test('баннер "Проект документа" отображается', async ({ page }) => {
      await page.goto(localePath('/legal/terms'))
      await expect(page.locator('body')).toContainText(/проект документа/i, { timeout: 10000 })
    })
  })

  // === Layout навигация между страницами ===
  test.describe('Навигация через layout', () => {
    test('навигационные ссылки на все юридические документы видны', async ({ page }) => {
      await page.goto(localePath('/legal/terms'))

      // Layout должен содержать ссылки на все юридические страницы
      const navLinks = page.getByRole('link')
      await expect(navLinks.filter({ hasText: /оферт/i }).first()).toBeVisible()
      await expect(navLinks.filter({ hasText: /конфиденциальност/i }).first()).toBeVisible()
      await expect(navLinks.filter({ hasText: /возврат/i }).first()).toBeVisible()
    })

    test('переход между юридическими страницами работает', async ({ page }) => {
      await page.goto(localePath('/legal/terms'))

      // Клик на «Политика конфиденциальности»
      await page
        .getByRole('link', { name: /конфиденциальност/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/legal\/privacy/i)

      // Клик на «Возвраты»
      await page
        .getByRole('link', { name: /возврат/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/ru\/legal\/returns/i)
    })
  })

  // === Footer ===
  test.describe('Ссылки из footer', () => {
    test('footer содержит ссылки на юридические страницы', async ({ page }) => {
      await page.goto(localePath('/'))
      const footer = page.locator('footer')

      // Footer должен содержать хотя бы некоторые юридические ссылки
      const legalLinks = footer.getByRole('link').filter({ hasText: /оферт|конфиденциальност|пользовательское/i })
      await expect(legalLinks.first()).toBeVisible({ timeout: 10000 })
    })

    test('из footer можно перейти на юридическую страницу', async ({ page }) => {
      await page.goto(localePath('/'))
      const footer = page.locator('footer')

      // Клик на любую юридическую ссылку в footer
      const legalLink = footer
        .getByRole('link')
        .filter({ hasText: /оферт|конфиденциальност|пользовательское/i })
        .first()
      await legalLink.click()
      await expect(page).toHaveURL(/\/ru\/legal\//i)
    })
  })
})
