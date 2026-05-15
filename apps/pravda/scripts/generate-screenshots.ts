/**
 * Скрипт генерации скриншотов для PWA manifest
 *
 * Запуск: bun run scripts/generate-screenshots.ts
 * Требует запущенный dev server на порту 3007
 */

import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { chromium } from 'playwright'

const PUBLIC_DIR = join(import.meta.dirname, '../public')
const BASE_URL = 'http://localhost:3007'

async function generateScreenshots() {
  console.log('📸 Генерация скриншотов для PWA...\n')

  // Создаём папку screenshots если не существует
  const screenshotsDir = join(PUBLIC_DIR, 'screenshots')
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true })
  }

  const browser = await chromium.launch()

  try {
    // Desktop скриншот (1280x720)
    console.log('  📱 Desktop (1280x720)...')
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    })
    const desktopPage = await desktopContext.newPage()
    await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle' })
    await desktopPage.screenshot({
      path: join(screenshotsDir, 'screenshot-desktop.png'),
      fullPage: false,
    })
    await desktopContext.close()
    console.log('    ✅ screenshot-desktop.png')

    // Mobile скриншот (390x844 - iPhone 14)
    console.log('  📱 Mobile (390x844)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' })
    await mobilePage.screenshot({
      path: join(screenshotsDir, 'screenshot-mobile.png'),
      fullPage: false,
    })
    await mobileContext.close()
    console.log('    ✅ screenshot-mobile.png')

    console.log('\n✨ Готово! Скриншоты сгенерированы.')
  } finally {
    await browser.close()
  }
}

generateScreenshots().catch(console.error)
