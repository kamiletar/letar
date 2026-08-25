/**
 * Скрипт генерации иконок для Electron приложения
 *
 * Запуск: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')

async function generateIcons() {
  const { generateIcons: generateIconsShared } = await import('@letar/icon-generator')

  const resourcesDir = path.join(__dirname, '..', 'resources')
  const svgPath = path.join(resourcesDir, 'icon.svg')

  await generateIconsShared({
    svgBuffer: fs.readFileSync(svgPath),
    outDir: resourcesDir,
    log: console.log,
  })

  console.log('\nГотово! Для macOS .icns используйте iconutil или онлайн конвертер.')
  console.log('Рекомендация: cloudconvert.com/png-to-icns')
}

generateIcons().catch((error) => {
  console.error('Ошибка:', error)
  process.exitCode = 1
})
