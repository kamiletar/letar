/**
 * Генерация PNG иконок из SVG
 * Запуск: node scripts/generate-icons.mjs
 */

import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import pngToIco from 'png-to-ico'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources')

// Размеры иконок для разных платформ
const sizes = [16, 24, 32, 48, 64, 128, 256, 512]

async function generateIcons() {
  const svgPath = join(resourcesDir, 'icon.svg')
  const svg = readFileSync(svgPath, 'utf-8')

  console.log('Генерация PNG иконок из SVG...')

  for (const size of sizes) {
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    })

    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    const outputPath = join(resourcesDir, `icon-${size}.png`)
    writeFileSync(outputPath, pngBuffer)
    console.log(`  ✓ ${outputPath}`)
  }

  // Основной icon.png (256x256)
  const resvg256 = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 256,
    },
  })
  const mainPng = resvg256.render().asPng()
  writeFileSync(join(resourcesDir, 'icon.png'), mainPng)
  console.log('  ✓ icon.png (256x256)')

  const icoSizes = [16, 32, 48, 256]
  const icoBuffer = await pngToIco(icoSizes.map((size) => join(resourcesDir, `icon-${size}.png`)))
  writeFileSync(join(resourcesDir, 'icon.ico'), icoBuffer)
  console.log('  ✓ icon.ico')

  console.log('\n✅ Иконки сгенерированы!')
}

generateIcons().catch(console.error)
