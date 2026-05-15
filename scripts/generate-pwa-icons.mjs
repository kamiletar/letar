#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Paths
const logoPath = join(__dirname, '../apps/premium-rosstil/src/app/_images/logo.svg')
const outputDir = join(__dirname, '../apps/premium-rosstil/public/icons')

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
  console.log(`✅ Created directory: ${outputDir}`)
}

// Generate icons
async function generateIcons() {
  console.log('🎨 Generating PWA icons from logo.svg...\n')

  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`)

    try {
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
        })
        .png()
        .toFile(outputPath)

      console.log(`✅ Generated: icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message)
    }
  }

  console.log('\n🎉 All PWA icons generated successfully!')
  console.log(`📁 Output directory: ${outputDir}`)
}

generateIcons().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
