/**
 * Генерация PNG/ICO иконок из resources/icon.svg
 * Запуск: node scripts/generate-icons.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateIcons } from '@letar/icon-generator'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources')

await generateIcons({
  svgBuffer: readFileSync(join(resourcesDir, 'icon.svg')),
  outDir: resourcesDir,
  log: console.log,
})

console.log('\nИконки сгенерированы!')
