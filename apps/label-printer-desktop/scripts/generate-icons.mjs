/**
 * Генерация PNG/ICO иконок из resources/icon.svg
 * Запуск: node scripts/generate-icons.mjs
 */
import { generateIcons } from '@letar/icon-generator'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources')

await generateIcons({
  svgBuffer: readFileSync(join(resourcesDir, 'icon.svg')),
  outDir: resourcesDir,
  log: console.log,
})

console.log('\n✅ Иконки сгенерированы!')
