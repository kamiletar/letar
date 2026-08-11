// Собирает dist/package.json из package.publish.json (шаблон) + версии из package.json
// (источник истины) — версия в package.publish.json не читается вовсе, чтобы рассинхрон
// между двумя файлами был структурно невозможен. Копия libs/forms/scripts/write-publish-package-json.mjs.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'))
const publishPackageJson = JSON.parse(readFileSync(path.join(root, 'package.publish.json'), 'utf-8'))

writeFileSync(
  path.join(root, 'dist/package.json'),
  JSON.stringify({ ...publishPackageJson, version }, null, 2) + '\n',
)
