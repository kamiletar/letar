/**
 * Генерирует иконку приложения (зелёный квадрат + буква «Ḱ²») в PNG/ICO.
 *
 * Буква нарисована полигонами, не <text> — шрифт в librsvg на Windows непредсказуем.
 * Акут над K — отсылка к самой функции приложения (Enter → ударение, U+0301), «²» — к
 * сочетанию клавиш (AltGr + K). На маленьких размерах (16/24/32) «²» съедается в кашу,
 * поэтому там остаётся только Ḱ без степени.
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

const K_GLYPH = `
  <polygon points="78,60 116,60 116,196 78,196" fill="${FG}" />
  <polygon points="112,120 168,60 216,60 136,146" fill="${FG}" />
  <polygon points="132,120 216,196 166,196 108,140" fill="${FG}" />
`

const ACUTE_ACCENT = `
  <path d="M 140 55 L 160 18" stroke="${FG}" stroke-width="15" stroke-linecap="round" fill="none" />
`

const SUPERSCRIPT_TWO = `
  <path d="M 224 26
           a 16 16 0 0 1 16 16
           c 0 10 -8 16 -16 24
           l -14 14 h 32"
        fill="none" stroke="${FG}" stroke-width="11"
        stroke-linecap="round" stroke-linejoin="round" />
`

// Сдвиг подобран не на глаз, а как центр масс (центроид) непрозрачных пикселей кластера
// K+акут+степень, посчитанный по альфа-каналу растеризованного SVG — приведён к центру холста
// 256×256 (128,128). Bbox-центр (геометрическая середина габаритного прямоугольника) даёт другой,
// худший результат: акут торчит высоко и узко, перетягивает bbox вверх, а «2» справа — вширь,
// так что оптический вес самого кластера K оказывается смещён иначе, чем его bbox.
const GLYPH_SHIFT_X = -13
const GLYPH_SHIFT_Y = 12

// Рендерим SVG сразу под целевой пиксельный размер (width/height = size, viewBox неизменен),
// а не растеризуем один раз в 256 и затем sharp .resize() вниз — ресайз растрового PNG даёт
// мутную кайму на скруглённых углах (полупрозрачные пиксели скругления ресемплятся отдельно
// от непрозрачной заливки). Прямая растеризация librsvg под каждый размер даёт чистый край.
function buildSvg(extras, size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="44" fill="${BG}" />
  <g transform="translate(${GLYPH_SHIFT_X},${GLYPH_SHIFT_Y})">
    ${K_GLYPH}
    ${extras}
  </g>
</svg>
`.trim()
}

async function main() {
  const resourcesDir = join(APP_DIR, 'resources')
  const publicDir = join(APP_DIR, 'renderer', 'public')
  await mkdir(resourcesDir, { recursive: true })
  await mkdir(publicDir, { recursive: true })

  const pngBuffer = await sharp(Buffer.from(buildSvg(ACUTE_ACCENT + SUPERSCRIPT_TWO, ICON_SIZE))).png().toBuffer()
  await writeFile(join(resourcesDir, 'icon.png'), pngBuffer)

  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const resizedBuffers = await Promise.all(
    icoSizes.map((size) => {
      const extras = size < 48 ? ACUTE_ACCENT : ACUTE_ACCENT + SUPERSCRIPT_TWO
      return sharp(Buffer.from(buildSvg(extras, size))).png().toBuffer()
    }),
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
