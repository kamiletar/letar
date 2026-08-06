/**
 * Скрипт для создания PWA скриншотов
 * Запуск: bunx tsx apps/mandala/scripts/take-pwa-screenshots.ts
 */

import { mkdir } from 'fs/promises'
import { join } from 'path'
import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3004'
const SCREENSHOTS_DIR = join(__dirname, '../public/screenshots')

// Конфигурация скриншотов
const screenshots = [
  // Desktop (wide)
  { name: 'desktop-home', url: '/', viewport: { width: 1280, height: 720 } },
  { name: 'desktop-gallery', url: '/mandalas', viewport: { width: 1280, height: 720 } },
  { name: 'desktop-mandala', url: '/mandalas', viewport: { width: 1280, height: 720 }, fullscreen: true },
  // Mobile (narrow)
  { name: 'mobile-home', url: '/', viewport: { width: 412, height: 915 } },
  { name: 'mobile-gallery', url: '/mandalas', viewport: { width: 412, height: 915 } },
  { name: 'mobile-mandala', url: '/mandalas', viewport: { width: 412, height: 915 }, fullscreen: true },
]

async function takeScreenshots() {
  // Создаём папку если нет
  await mkdir(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  for (const config of screenshots) {
    console.log(`📸 Taking screenshot: ${config.name}`)

    const context = await browser.newContext({
      viewport: config.viewport,
      deviceScaleFactor: 2, // Retina качество
    })
    const page = await context.newPage()

    // Переходим на страницу
    await page.goto(`${BASE_URL}${config.url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000) // Ждём анимации

    // Если нужен fullscreen - кликаем на первую мандалу и включаем fullscreen
    if (config.fullscreen) {
      // Кликаем на первую мандалу в списке
      const firstMandala = page.locator('a[href^="/mandalas/"]').first()
      if ((await firstMandala.count()) > 0) {
        await firstMandala.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000)

        // Ищем кнопку fullscreen
        const fullscreenBtn = page
          .locator(
            'button:has-text("На весь экран"), button[aria-label*="fullscreen"], button[aria-label*="Fullscreen"]',
          )
          .first()
        if ((await fullscreenBtn.count()) > 0) {
          await fullscreenBtn.click()
          await page.waitForTimeout(500)
        }
      }
    }

    // Делаем скриншот
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${config.name}.png`),
      type: 'png',
    })

    await context.close()
    console.log(`✅ Saved: ${config.name}.png`)
  }

  await browser.close()
  console.log('\n🎉 All screenshots taken!')
}

takeScreenshots().catch(console.error)
