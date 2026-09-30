// Собирает dist/package.json из package.publish.json (шаблон) + версии из package.json
// (источник истины) — версия в package.publish.json не читается вовсе, чтобы рассинхрон
// между двумя файлами был структурно невозможен.
//
// Общий скрипт конвейера build:npm всех публикуемых libs/*. Запускается из каталога библиотеки
// (`cwd` таргета Nx = libs/<name>): `node ../../scripts/write-publish-package-json.mjs`.
// Корень библиотеки берётся из process.cwd(), а не из расположения скрипта.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

for (const file of ['package.json', 'package.publish.json']) {
  if (!existsSync(path.join(root, file))) {
    console.error(`write-publish-package-json: нет ${file} в ${root} — запускай из каталога библиотеки`)
    process.exit(1)
  }
}
if (!existsSync(path.join(root, 'dist'))) {
  console.error('write-publish-package-json: нет dist/ — сначала tsup')
  process.exit(1)
}

const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'))
const publishPackageJson = JSON.parse(readFileSync(path.join(root, 'package.publish.json'), 'utf-8'))

writeFileSync(
  path.join(root, 'dist/package.json'),
  JSON.stringify({ ...publishPackageJson, version }, null, 2) + '\n',
)
