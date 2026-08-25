import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

// PNG-размеры, покрывающие все платформы Electron-приложений монорепо (Windows/macOS/Linux
// значки, ярлыки на рабочем столе и панель задач). Найдено дублирование трёх независимых копий
// generate-icons.mjs/.js — animatrona, label-printer-desktop, poster-microtext-desktop.
export const DEFAULT_SIZES = [16, 24, 32, 48, 64, 128, 256, 512]

// Windows .ico — стандартный набор вложенных разрешений.
export const DEFAULT_ICO_SIZES = [16, 32, 48, 256]

export const DEFAULT_MAIN_ICON_SIZE = 256

/**
 * Генерирует PNG-иконки нескольких размеров и .ico из одного SVG.
 *
 * @param {object} options
 * @param {string} options.svgBuffer - содержимое icon.svg (Buffer или string)
 * @param {string} options.outDir - куда писать icon-*.png, icon.png, icon.ico
 * @param {number[]} [options.sizes] - размеры PNG
 * @param {number[]} [options.icoSizes] - подмножество sizes для сборки .ico
 * @param {number} [options.mainIconSize] - размер icon.png (используется на Linux)
 * @param {number} [options.density] - density рендера sharp (векторная резкость мелких деталей SVG)
 * @param {(message: string) => void} [options.log]
 * @returns {Promise<{ pngPaths: string[], mainIconPath: string, icoPath: string }>}
 */
export async function generateIcons({
  svgBuffer,
  outDir,
  sizes = DEFAULT_SIZES,
  icoSizes = DEFAULT_ICO_SIZES,
  mainIconSize = DEFAULT_MAIN_ICON_SIZE,
  density = 384,
  log = () => {},
}) {
  log('Генерация PNG иконок из SVG...')

  const pngPathBySize = new Map()
  for (const size of sizes) {
    const outputPath = join(outDir, `icon-${size}.png`)
    await sharp(svgBuffer, { density }).resize(size, size).png().toFile(outputPath)
    pngPathBySize.set(size, outputPath)
    log(`  ✓ ${outputPath}`)
  }

  const mainIconPath = join(outDir, 'icon.png')
  await sharp(svgBuffer, { density }).resize(mainIconSize, mainIconSize).png().toFile(mainIconPath)
  log(`  ✓ icon.png (${mainIconSize}x${mainIconSize})`)

  const icoPngPaths = icoSizes.map((size) => pngPathBySize.get(size)).filter((path) => path !== undefined)
  const icoBuffer = await pngToIco(icoPngPaths)
  const icoPath = join(outDir, 'icon.ico')
  writeFileSync(icoPath, icoBuffer)
  log('  ✓ icon.ico')

  return { pngPaths: [...pngPathBySize.values()], mainIconPath, icoPath }
}
