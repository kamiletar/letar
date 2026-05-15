#!/usr/bin/env node
/**
 * Скрипт для генерации Service Worker с версией из package.json
 * Запускается перед билдом: nx run driving-school:update-sw-version
 *
 * Читает public/sw.template.js, подставляет версию и создаёт public/sw.js
 * Файл sw.js добавлен в .gitignore, т.к. генерируется на этапе сборки
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

// Читаем версию из package.json
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'))
const version = packageJson.version

// Читаем шаблон sw.template.js
const templatePath = join(projectRoot, 'public', 'sw.template.js')
const outputPath = join(projectRoot, 'public', 'sw.js')
let swContent = readFileSync(templatePath, 'utf-8')

// Заменяем SW_VERSION
const versionRegex = /const SW_VERSION = ['"][^'"]+['"]/
const newVersionLine = `const SW_VERSION = '${version}'`

if (versionRegex.test(swContent)) {
  swContent = swContent.replace(versionRegex, newVersionLine)
  writeFileSync(outputPath, swContent, 'utf-8')

  console.log(`[update-sw-version] sw.js создан с версией ${version}`)
} else {
  console.error('[update-sw-version] Не найден SW_VERSION в sw.template.js')
  process.exit(1)
}
