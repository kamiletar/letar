#!/usr/bin/env node
/**
 * Скрипт для генерации PWA иконок из logo.svg
 * Запуск: node scripts/generate-icons.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const ICON_DIR = join(projectRoot, 'public', 'icons')
const LOGO_PATH = join(projectRoot, 'public', 'logo.svg')

// Прозрачный фон
const BACKGROUND_COLOR = { r: 0, g: 0, b: 0, alpha: 0 }

async function generateIcons() {
  // Ensure icons directory exists
  mkdirSync(ICON_DIR, { recursive: true })

  // Read the SVG
  const svgBuffer = readFileSync(LOGO_PATH)

  for (const size of SIZES) {
    const padding = Math.round(size * 0.1) // 10% padding for maskable icons
    const logoSize = size - padding * 2

    // Create icon with brand color background and centered logo
    const icon = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BACKGROUND_COLOR,
      },
    })
      .composite([
        {
          input: await sharp(svgBuffer)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer(),
          gravity: 'center',
        },
      ])
      .png()
      .toBuffer()

    const outputPath = join(ICON_DIR, `icon-${size}x${size}.png`)
    writeFileSync(outputPath, icon)

    console.log(`✓ Generated ${size}x${size}`)
  }

  console.log(`\n✅ All ${SIZES.length} icons generated in public/icons/`)
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
