/**
 * Скрипт для генерации PWA иконок
 * Запуск: npx tsx apps/kami/scripts/generate-pwa-icons.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

// Размеры иконок для PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

// Директория для сохранения иконок
const OUTPUT_DIR = path.join(__dirname, '../public/icons')

// Создаём SVG иконку с буквой K (Kami)
function createIconSvg(size: number): string {
  const fontSize = size * 0.6
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#00d9ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0080ff;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0a0a0a"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="bold"
        font-size="${fontSize}"
        fill="url(#grad)"
      >K</text>
    </svg>
  `.trim()
}

async function generateIcons() {
  // Создаём директорию, если не существует
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  console.log('Генерация PWA иконок...')

  for (const size of ICON_SIZES) {
    const svg = createIconSvg(size)
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)

    await sharp(Buffer.from(svg)).png().toFile(outputPath)

    console.log(`✅ Создана иконка: icon-${size}x${size}.png`)
  }

  console.log('\n🎉 Все иконки успешно созданы!')
}

generateIcons().catch(console.error)
