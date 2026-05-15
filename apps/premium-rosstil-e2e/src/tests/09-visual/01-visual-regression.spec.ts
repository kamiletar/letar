/**
 * Visual Regression тесты — скриншоты ключевых страниц
 *
 * Первый запуск создаёт базовые скриншоты (golden files).
 * Последующие запуски сравнивают с базовыми — обнаруживают визуальные регрессии.
 *
 * Обновить базовые: nx e2e premium-rosstil-e2e -- --update-snapshots --project=visual-chromium
 */
import { expect, test } from '@playwright/test'

import { localePath } from '../../config/i18n'

test.describe('Visual Regression — ключевые страницы', () => {
  // Публичные страницы (без авторизации)
  test.use({ storageState: { cookies: [], origins: [] } })

  test('главная страница', async ({ page }) => {
    await page.goto(localePath('/'))
    // Ждём загрузки контента
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('страница "О бренде"', async ({ page }) => {
    await page.goto(localePath('/about'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('about-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('страница контактов', async ({ page }) => {
    await page.goto(localePath('/contacts'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('contacts-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('страница доставки', async ({ page }) => {
    await page.goto(localePath('/about/delivery'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('delivery-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('страница авторизации', async ({ page }) => {
    await page.goto(localePath('/auth/signin'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('signin-page.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('страница регистрации', async ({ page }) => {
    await page.goto(localePath('/auth/register'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('register-page.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})

test.describe('Visual Regression — адаптивность', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('главная — планшет (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(localePath('/'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('home-tablet.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('главная — мобильный (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(localePath('/'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('home-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('авторизация — мобильный (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(localePath('/auth/signin'))
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveScreenshot('signin-mobile.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})
