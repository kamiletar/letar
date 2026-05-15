/**
 * Скрипт генерации PWA иконок из het.svg
 *
 * Запуск: bun run scripts/generate-icons.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

const PUBLIC_DIR = join(import.meta.dirname, '../public')
const SVG_PATH = join(PUBLIC_DIR, 'het.svg')

// Размеры иконок для PWA
const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512]

async function generateIcons() {
  console.log('🖼️  Генерация PWA иконок из het.svg...\n')

  // Создаём папку icons если не существует
  const iconsDir = join(PUBLIC_DIR, 'icons')
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true })
  }

  // Генерируем PNG иконки разных размеров
  for (const size of ICON_SIZES) {
    const outputPath = join(iconsDir, `icon-${size}.png`)
    await sharp(SVG_PATH)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath)
    console.log(`  ✅ icon-${size}.png`)
  }

  // Apple Touch Icon (180x180)
  const appleTouchPath = join(PUBLIC_DIR, 'apple-touch-icon.png')
  await sharp(SVG_PATH)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(appleTouchPath)
  console.log('  ✅ apple-touch-icon.png')

  // Favicon ICO (мультиразмерный) — создаём PNG 32x32 как favicon.png
  // Для .ico нужен отдельный инструмент, используем PNG как fallback
  const faviconPngPath = join(PUBLIC_DIR, 'favicon.png')
  await sharp(SVG_PATH)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(faviconPngPath)
  console.log('  ✅ favicon.png (32x32)')

  // Создаём favicon.ico из 16x16 PNG
  const favicon16Path = join(PUBLIC_DIR, 'favicon-16.png')
  await sharp(SVG_PATH)
    .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(favicon16Path)

  // Конвертируем в ICO формат (простая обёртка PNG в ICO)
  const pngBuffer = await sharp(SVG_PATH)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()

  // Простой ICO файл с одним изображением 32x32
  const icoBuffer = createIcoFromPng(pngBuffer, 32, 32)
  writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), icoBuffer)
  console.log('  ✅ favicon.ico (32x32)')

  console.log('\n✨ Готово! Все иконки сгенерированы.')
}

/**
 * Создаёт ICO файл из PNG буфера
 * ICO формат: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function createIcoFromPng(pngBuffer: Buffer, width: number, height: number): Buffer {
  const imageCount = 1
  const headerSize = 6
  const entrySize = 16
  const dataOffset = headerSize + entrySize * imageCount

  // ICO Header
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type (1 = ICO)
  header.writeUInt16LE(imageCount, 4) // Image count

  // ICO Directory Entry
  const entry = Buffer.alloc(entrySize)
  entry.writeUInt8(width === 256 ? 0 : width, 0) // Width
  entry.writeUInt8(height === 256 ? 0 : height, 1) // Height
  entry.writeUInt8(0, 2) // Color palette
  entry.writeUInt8(0, 3) // Reserved
  entry.writeUInt16LE(1, 4) // Color planes
  entry.writeUInt16LE(32, 6) // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8) // Image size
  entry.writeUInt32LE(dataOffset, 12) // Image offset

  return Buffer.concat([header, entry, pngBuffer])
}

generateIcons().catch(console.error)
