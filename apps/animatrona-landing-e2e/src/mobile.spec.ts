import { expect, test } from '@playwright/test'

/** Мобильный viewport (iPhone SE) */
const MOBILE_VIEWPORT = { width: 375, height: 667 }

test.describe('Мобильная адаптивность', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
  })

  test('главная страница не даёт горизонтальную прокрутку на мобильном viewport', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(hasHorizontalScroll).toBe(false)
  })

  test('мобильное меню (Drawer) открывается по клику на бургер и содержит пункты навигации', async ({ page }) => {
    await page.goto('/')
    // networkidle не подходит для Next.js dev-режима — HMR держит websocket открытым вечно.
    // Клик по бургеру может попасть до навешивания onClick (SSR→hydrate race), поэтому кликаем в цикле,
    // пока Drawer реально не откроется — устойчивее фиксированной задержки.
    const menuButton = page.getByRole('button', { name: 'Открыть меню' })
    await expect(menuButton).toBeVisible()
    const dialog = page.getByRole('dialog')
    await expect(async () => {
      // Клик — только если Drawer ещё не открыт: иначе повторная попытка его закроет (toggle)
      if (!(await dialog.isVisible())) {
        await menuButton.click()
      }
      await expect(dialog).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    // Drawer рендерится в Portal — ищем через role, не через локальный DOM navbar
    await expect(dialog.getByRole('link', { name: 'Возможности' })).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Документация' })).toBeVisible()
  })

  test('клик по пункту "Документация" в мобильном меню закрывает Drawer и открывает /docs/quick-start', async ({ page }) => {
    await page.goto('/')

    const menuButton = page.getByRole('button', { name: 'Открыть меню' })
    await expect(menuButton).toBeVisible()
    const dialog = page.getByRole('dialog')
    await expect(async () => {
      // Клик — только если Drawer ещё не открыт: иначе повторная попытка его закроет (toggle)
      if (!(await dialog.isVisible())) {
        await menuButton.click()
      }
      await expect(dialog).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    await dialog.getByRole('link', { name: 'Документация' }).click()

    await expect(page).toHaveURL(/\/docs\/quick-start\/?$/, { timeout: 15000 })
    await expect(dialog).toBeHidden()
  })
})
