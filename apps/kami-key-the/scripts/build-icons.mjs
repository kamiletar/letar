/**
 * Генерирует иконку приложения (зелёный квадрат + буква «K») в PNG/ICO.
 *
 * Буква нарисована полигонами, не <text> — шрифт в librsvg на Windows непредсказуем.
 * Запуск: node apps/kami-key-the/scripts/build-icons.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const ICON_SIZE = 256
const BG = '#39ff14'
const FG = '#0b0e0c'

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="44" fill="${BG}" />
  <polygon points="78,60 116,60 116,196 78,196" fill="${FG}" />
  <polygon points="112,120 168,60 216,60 136,146" fill="${FG}" />
  <polygon points="132,120 216,196 166,196 108,140" fill="${FG}" />
</svg>
`.trim()

async function main() {
  const resourcesDir = join(APP_DIR, 'resources')
  const publicDir = join(APP_DIR, 'renderer', 'public')
  await mkdir(resourcesDir, { recursive: true })
  await mkdir(publicDir, { recursive: true })

  const pngBuffer = await sharp(Buffer.from(SVG)).png().toBuffer()
  await writeFile(join(resourcesDir, 'icon.png'), pngBuffer)

  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const resizedBuffers = await Promise.all(
    icoSizes.map((size) => sharp(Buffer.from(SVG)).resize(size, size).png().toBuffer()),
  )
  const icoBuffer = await pngToIco(resizedBuffers)
  await writeFile(join(resourcesDir, 'icon.ico'), icoBuffer)
  await writeFile(join(publicDir, 'favicon.ico'), icoBuffer)

  console.log('Иконки собраны: resources/icon.png, resources/icon.ico, renderer/public/favicon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
