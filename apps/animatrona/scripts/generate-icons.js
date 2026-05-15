/**
 * Скрипт генерации иконок для Electron приложения
 *
 * Требования:
 * - sharp: npm install sharp
 * - Для .ico: npm install png-to-ico
 *
 * Запуск: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')

async function generateIcons() {
  try {
    // Динамический импорт sharp
    const sharp = require('sharp')

    const resourcesDir = path.join(__dirname, '..', 'resources')
    const svgPath = path.join(resourcesDir, 'icon.svg')

    console.log('Генерация иконок из SVG...')

    // Читаем SVG
    const svgBuffer = fs.readFileSync(svgPath)

    // Генерируем PNG разных размеров
    const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

    for (const size of sizes) {
      const outputPath = path.join(resourcesDir, `icon-${size}.png`)
      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath)
      console.log(`  Создан: icon-${size}.png`)
    }

    // Основная иконка 512x512 для Linux
    const icon512Path = path.join(resourcesDir, 'icon.png')
    await sharp(svgBuffer).resize(512, 512).png().toFile(icon512Path)
    console.log('  Создан: icon.png (512x512)')

    // Генерация .ico для Windows (требует png-to-ico)
    try {
      const pngToIco = require('png-to-ico')

      // Используем несколько размеров для .ico
      const icoSizes = [16, 32, 48, 256]
      const pngBuffers = await Promise.all(icoSizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer()))

      const icoBuffer = await pngToIco(pngBuffers)
      const icoPath = path.join(resourcesDir, 'icon.ico')
      fs.writeFileSync(icoPath, icoBuffer)
      console.log('  Создан: icon.ico')
    } catch (e) {
      console.log('  Пропущен icon.ico (установите png-to-ico: npm install png-to-ico)')
    }

    console.log('\nГотово! Для macOS .icns используйте iconutil или онлайн конвертер.')
    console.log('Рекомендация: cloudconvert.com/png-to-icns')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Ошибка: sharp не установлен')
      console.log('\nУстановите зависимости:')
      console.log('  npm install sharp png-to-ico')
      console.log('\nИли используйте онлайн конвертеры:')
      console.log('  - PNG: https://svgtopng.com/')
      console.log('  - ICO: https://convertico.com/')
      console.log('  - ICNS: https://cloudconvert.com/png-to-icns')
    } else {
      console.error('Ошибка:', error)
    }
  }
}

generateIcons()
