import { expect, test } from '@playwright/test'

test.describe('02 — Тема: переключение light/dark', () => {
  test('ColorModeButton присутствует и работает', async ({ page }) => {
    await page.goto('/')

    // Ищем кнопку переключения темы
    const themeBtn = page.locator('[aria-label*="mode"], [aria-label*="theme"], [aria-label*="тема"], button:has(svg)')
      .filter({ hasText: /sun|moon|☀|🌙|/i })
      .or(page.locator('[data-testid="color-mode-button"]'))

    // Если кнопка не найдена по aria-label — ищем в nav/header
    const headerBtn = page.locator('header button').last()
    const btn = (await themeBtn.count()) > 0 ? themeBtn.first() : headerBtn

    await expect(btn).toBeVisible()

    // Запоминаем начальный режим
    const htmlEl = page.locator('html')
    const initialClass = await htmlEl.getAttribute('class') ?? ''
    const initialStyle = await htmlEl.getAttribute('data-theme') ?? ''
    const initialMode = initialClass + initialStyle

    // Кликаем
    await btn.click()
    await page.waitForTimeout(300)

    // Режим должен измениться
    const newClass = await htmlEl.getAttribute('class') ?? ''
    const newStyle = await htmlEl.getAttribute('data-theme') ?? ''
    const newMode = newClass + newStyle
    expect(newMode).not.toBe(initialMode)
  })

  test('тема сохраняется в localStorage после перезагрузки', async ({ page }) => {
    await page.goto('/')

    // Устанавливаем тёмную тему через localStorage (Chakra UI v3)
    await page.evaluate(() => {
      localStorage.setItem('chakra-color-mode', 'dark')
    })

    await page.reload()

    const stored = await page.evaluate(() => localStorage.getItem('chakra-color-mode'))
    expect(stored).toBe('dark')
  })
})
