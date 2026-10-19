// Собирает dist/package.json из package.publish.json (шаблон) + версии из package.json
// (источник истины) — версия в package.publish.json не читается вовсе, чтобы рассинхрон
// между двумя файлами был структурно невозможен.
//
// Общий скрипт конвейера build:npm всех публикуемых libs/*. Запускается из каталога библиотеки
// (`cwd` таргета Nx = libs/<name>): `node ../../scripts/write-publish-package-json.mjs`.
// Корень библиотеки берётся из process.cwd(), а не из расположения скрипта.
//
// Внутренние зависимости: в `dependencies`/`peerDependencies`/`optionalDependencies` шаблона
// значение `workspace:^` заменяется на `^<версия>` из package.json пакета с таким именем среди
// libs/* (поиск по полю `name`, не по имени каталога). Пакет не найден или в готовом
// dist/package.json остался `workspace:` — ошибка и exit 1: такой tarball нельзя установить из npm.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies']

/**
 * Карта «имя пакета → версия» по package.json всех библиотек монорепо.
 * @param {string} libsDir абсолютный путь к каталогу libs
 */
export function collectLibVersions(libsDir) {
  const versions = new Map()
  for (const entry of readdirSync(libsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    const file = path.join(libsDir, entry.name, 'package.json')
    if (!existsSync(file)) {
      continue
    }
    const pkg = JSON.parse(readFileSync(file, 'utf-8'))
    if (pkg.name && pkg.version) {
      versions.set(pkg.name, pkg.version)
    }
  }
  return versions
}

/**
 * Заменяет `workspace:^` на `^<версия>` в полях зависимостей шаблона.
 * Возвращает `{ result, errors }` — шаблон не мутируется.
 * @param {Record<string, any>} template содержимое package.publish.json
 * @param {Map<string, string>} versions карта «имя пакета → версия»
 */
export function resolveWorkspaceDeps(template, versions) {
  const result = structuredClone(template)
  const errors = []
  const notFound = new Set()
  for (const field of DEP_FIELDS) {
    const deps = result[field]
    if (!deps) {
      continue
    }
    for (const [name, range] of Object.entries(deps)) {
      if (range === 'workspace:^') {
        const version = versions.get(name)
        if (!version) {
          errors.push(`${field}.${name}: пакет не найден среди libs/*/package.json`)
          notFound.add(`${field}.${name}`)
          continue
        }
        deps[name] = `^${version}`
      }
    }
  }
  // Остаток `workspace:` (например `workspace:*`) — тоже ошибка, npm такое не поймёт.
  for (const field of DEP_FIELDS) {
    for (const [name, range] of Object.entries(result[field] ?? {})) {
      if (String(range).startsWith('workspace:') && !notFound.has(`${field}.${name}`)) {
        errors.push(`${field}.${name}: остался протокол ${range}`)
      }
    }
  }
  return { result, errors }
}

function main() {
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

  const libsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'libs')
  const { result, errors } = resolveWorkspaceDeps(publishPackageJson, collectLibVersions(libsDir))
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`write-publish-package-json: ${error}`)
    }
    process.exit(1)
  }

  writeFileSync(path.join(root, 'dist/package.json'), JSON.stringify({ ...result, version }, null, 2) + '\n')
}

// Запуск только как CLI: при импорте из теста main() не вызывается.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
