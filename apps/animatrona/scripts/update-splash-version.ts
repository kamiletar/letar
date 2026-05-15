/**
 * Генерация splash.html из шаблона с версией из package.json
 * Запускается перед билдом: nx run animatrona:build
 *
 * Читает resources/splash.template.html → подставляет __VERSION__ → resources/splash.html
 * Файл splash.html добавлен в .gitignore, т.к. генерируется на этапе сборки
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

// Читаем версию из package.json
const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const version = packageJson.version

// Читаем шаблон
const templatePath = join(ROOT, 'resources', 'splash.template.html')
const outputPath = join(ROOT, 'resources', 'splash.html')
const template = readFileSync(templatePath, 'utf-8')

// Заменяем __VERSION__ на актуальную версию
if (template.includes('__VERSION__')) {
  const output = template.replaceAll('__VERSION__', version)
  writeFileSync(outputPath, output, 'utf-8')
  console.log(`✅ splash.html создан с версией v${version}`)
} else {
  console.error('⚠️ Не найден __VERSION__ в splash.template.html')
  process.exit(1)
}
