#!/usr/bin/env node

/**
 * PWA Screenshots Generator
 *
 * Generates screenshots for PWA manifest using Playwright.
 * Screenshots are used in the "Add to Home Screen" install prompt.
 *
 * Usage:
 *   bun run generate:pwa-screenshots
 *   node scripts/generate-pwa-screenshots.mjs
 *
 * Options:
 *   --base-url <url>  Base URL to capture (default: http://localhost:3000)
 *
 * Requirements:
 *   - Site must be running at the base URL
 *   - Playwright will be auto-installed if not present
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse command line arguments
const args = process.argv.slice(2)
const baseUrlIndex = args.indexOf('--base-url')
const BASE_URL = baseUrlIndex !== -1 ? args[baseUrlIndex + 1] : 'http://localhost:3000'

// Paths
const outputDir = join(__dirname, '../apps/premium-rosstil/public/screenshots')
const manifestPath = join(__dirname, '../apps/premium-rosstil/public/manifest.json')

// Screenshot configurations
const screenshots = [
  {
    name: 'screenshot-mobile-home',
    url: '/',
    width: 540,
    height: 720,
    formFactor: 'narrow',
    label: 'Главная страница',
  },
  {
    name: 'screenshot-mobile-catalog',
    url: '/catalog',
    width: 540,
    height: 720,
    formFactor: 'narrow',
    label: 'Каталог товаров',
  },
  {
    name: 'screenshot-desktop-home',
    url: '/',
    width: 1280,
    height: 720,
    formFactor: 'wide',
    label: 'Главная страница',
  },
  {
    name: 'screenshot-desktop-catalog',
    url: '/catalog',
    width: 1280,
    height: 720,
    formFactor: 'wide',
    label: 'Каталог товаров',
  },
]

// Ensure Playwright is installed
async function ensurePlaywright() {
  try {
    await import('playwright')
    return true
  } catch {
    console.log('📦 Installing Playwright...')
    try {
      execSync('bun add -d playwright', { stdio: 'inherit', cwd: join(__dirname, '..') })
      execSync('bunx playwright install chromium', { stdio: 'inherit', cwd: join(__dirname, '..') })
      return true
    } catch (error) {
      console.error('❌ Failed to install Playwright:', error.message)
      console.log('\nPlease install manually:')
      console.log('  bun add -d playwright')
      console.log('  bunx playwright install chromium')
      return false
    }
  }
}

// Create output directory
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
  console.log(`✅ Created directory: ${outputDir}`)
}

async function generateScreenshots() {
  console.log('📸 Generating PWA screenshots...\n')
  console.log(`🌐 Base URL: ${BASE_URL}\n`)

  // Check if site is available
  try {
    const response = await fetch(BASE_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Cannot connect to ${BASE_URL}`)
    console.log('\nPlease ensure the development server is running:')
    console.log('  nx dev premium-rosstil')
    process.exit(1)
  }

  // Ensure Playwright is available
  const playwrightReady = await ensurePlaywright()
  if (!playwrightReady) {
    process.exit(1)
  }

  // Dynamic import after ensuring installation
  const { chromium } = await import('playwright')

  const browser = await chromium.launch()
  const generatedScreenshots = []

  try {
    for (const config of screenshots) {
      console.log(`📷 Capturing: ${config.name} (${config.width}x${config.height})...`)

      const context = await browser.newContext({
        viewport: { width: config.width, height: config.height },
        deviceScaleFactor: 2, // Retina quality
      })

      const page = await context.newPage()

      try {
        await page.goto(`${BASE_URL}${config.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        })

        // Wait for any animations to complete
        await page.waitForTimeout(1000)

        const outputPath = join(outputDir, `${config.name}.png`)
        await page.screenshot({
          path: outputPath,
          type: 'png',
        })

        generatedScreenshots.push({
          src: `/screenshots/${config.name}.png`,
          sizes: `${config.width}x${config.height}`,
          type: 'image/png',
          form_factor: config.formFactor,
          label: config.label,
        })

        console.log(`   ✅ Saved: ${config.name}.png`)
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`)
      }

      await context.close()
    }
  } finally {
    await browser.close()
  }

  // Update manifest.json
  if (generatedScreenshots.length > 0) {
    console.log('\n📝 Updating manifest.json...')

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      manifest.screenshots = generatedScreenshots
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log('✅ manifest.json updated with screenshots')
    } catch (error) {
      console.error('❌ Failed to update manifest.json:', error.message)
    }
  }

  console.log(`\n🎉 Generated ${generatedScreenshots.length}/${screenshots.length} screenshots!`)
  console.log(`📁 Output directory: ${outputDir}`)
}

generateScreenshots().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
