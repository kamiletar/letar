#!/usr/bin/env node
// Проверяет, что каждый tsconfig.json потребителя (внутри apps/ или внутри
// libs/ — библиотеки тоже потребляют подпути друг друга через свои
// tsconfig.json/tsconfig.lib.json/tsconfig.spec.json), у которого в
// compilerOptions.paths есть хотя бы одна запись "@letar/<lib>" или
// "@letar/<lib>/<subpath>", покрывает ВСЕ subpath-экспорты этой библиотеки из
// libs/<lib>/package.json → exports — а не только те, что были нужны на момент
// подключения потребителя.
//
// Почему это важно: приложение компилирует исходники библиотеки напрямую (через
// customConditions), а не её .d.ts. Значит любой @letar/*-импорт внутри этих
// исходников обязан резолвиться и у потребителя, даже если сам потребитель этот
// подпуть не использует. Пока библиотека не начинает импортировать недостающий
// подпуть изнутри — расхождение незаметно; как только начинает — все потребители
// с неполным набором paths ловят TS2307 разом (и TS2322-каскад, если тип попал в
// сигнатуру). Инцидент и разбор — PLAN.md §44/§45, .claude/rules/libs.md
// «Потребителю нужны paths и на транзитивные @letar/*, и на все их подпути».
//
// Использование:
//   node scripts/check-lib-subpath-paths.mjs
//
// Exit code 0 — расхождений нет. Exit code 1 — найдены неполные потребители
// (список выводится в консоль). Годится для ручного прогона и для CI/pre-commit —
// подключение в обязательный хук оставлено на усмотрение пользователя.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { walk } from './lib/fs-walk.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

// --- 1. Собираем subpath-экспорты каждой библиотеки из libs/*/package.json ---

function collectLibSubpaths() {
  const libsDir = path.join(repoRoot, 'libs')
  const libNames = readdirSync(libsDir).filter((name) => {
    const full = path.join(libsDir, name)
    return statSync(full).isDirectory()
  })

  const libs = new Map() // "@letar/<lib>" -> { subpaths: Set<alias>, libDir: "<lib>" }

  for (const libName of libNames) {
    const pkgPath = path.join(libsDir, libName, 'package.json')
    let pkg
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    } catch {
      continue // библиотека без package.json (генерируемая/служебная папка) — пропускаем
    }
    const exportsField = pkg.exports
    if (!exportsField || typeof exportsField !== 'object') { continue }

    const pkgAlias = pkg.name ?? `@letar/${libName}`
    const subpaths = new Set()
    for (const exportKey of Object.keys(exportsField)) {
      if (exportKey === './package.json') { continue }
      const alias = exportKey === '.' ? pkgAlias : `${pkgAlias}${exportKey.slice(1)}`
      subpaths.add(alias)
    }
    if (subpaths.size > 0) {
      libs.set(pkgAlias, { subpaths, libDir: libName })
    }
  }

  return libs
}

// --- 2. Находим tsconfig потребителей: внутри apps/ (включая приватные submodule)
//        и внутри libs/ (библиотеки тоже потребляют подпути друг друга) ---

function findTsconfigs(dir, depth) {
  return walk(dir, (entry) => entry === 'tsconfig.json', depth)
}

// В apps/ потребитель — один tsconfig.json на приложение. В libs/ реальный набор
// paths часто размазан по tsconfig.lib.json/tsconfig.spec.json (см. libs/forms-core,
// libs/forms) — проверяем все три, а не только базовый tsconfig.json.
const LIB_TSCONFIG_NAMES = ['tsconfig.json', 'tsconfig.lib.json', 'tsconfig.spec.json']

function findLibTsconfigs(libsDir) {
  return walk(libsDir, (entry) => LIB_TSCONFIG_NAMES.includes(entry), 1)
}

// Имя библиотеки-владельца по пути tsconfig внутри libs/<lib>/... — нужно, чтобы
// исключить самоссылку (forms-core не обязан держать paths на свои же подпути).
function ownerLibDir(libsDir, tsconfigPath) {
  const relPath = path.relative(libsDir, tsconfigPath)
  return relPath.split(path.sep)[0]
}

// tsconfig.json могут содержать JSONC-комментарии (см. apps/aboi-e2e/tsconfig.json) —
// парсим тем же способом, что и сам tsc, а не голым JSON.parse.
function readTsconfigPaths(tsconfigPath) {
  const text = readFileSync(tsconfigPath, 'utf8')
  const result = ts.parseConfigFileTextToJson(tsconfigPath, text)
  if (result.error || !result.config) { return null }
  const paths = result.config.compilerOptions?.paths ?? result.config.paths
  if (!paths || typeof paths !== 'object') { return null }
  return paths
}

// --- 3. Сверяем ---

function main() {
  const libs = collectLibSubpaths()
  const appsDir = path.join(repoRoot, 'apps')
  const libsDir = path.join(repoRoot, 'libs')
  const appTsconfigFiles = findTsconfigs(appsDir, 3)
  const libTsconfigFiles = findLibTsconfigs(libsDir)
  const tsconfigFiles = [...appTsconfigFiles, ...libTsconfigFiles].sort()

  const findings = [] // { tsconfigPath, pkgAlias, missing: string[] }
  let checkedConsumers = 0

  for (const tsconfigPath of tsconfigFiles) {
    const paths = readTsconfigPaths(tsconfigPath)
    if (!paths) { continue }

    const pathKeys = new Set(Object.keys(paths))
    const isLibTsconfig = tsconfigPath.startsWith(libsDir + path.sep)
    const selfLibDir = isLibTsconfig ? ownerLibDir(libsDir, tsconfigPath) : null

    for (const [pkgAlias, { subpaths, libDir }] of libs) {
      if (selfLibDir !== null && libDir === selfLibDir) { continue } // не требуем paths на самого себя

      const referencesLib = [...pathKeys].some(
        (key) => key === pkgAlias || key.startsWith(`${pkgAlias}/`),
      )
      if (!referencesLib) { continue }

      checkedConsumers++
      const missing = [...subpaths].filter((alias) => !pathKeys.has(alias)).sort()
      if (missing.length > 0) {
        findings.push({ tsconfigPath, pkgAlias, missing })
      }
    }
  }

  if (findings.length === 0) {
    console.log(`✅ Расхождений не найдено.`)
    console.log(`Библиотек с subpath-экспортами: ${libs.size}`)
    console.log(`Проверено tsconfig.json: ${tsconfigFiles.length}`)
    console.log(`Потребителей (tsconfig × библиотека), у которых есть хоть один path: ${checkedConsumers}`)
    process.exit(0)
  }

  console.log(`❌ Найдены неполные наборы paths — ${findings.length} потребител(ь/я/ей):\n`)
  for (const { tsconfigPath, pkgAlias, missing } of findings) {
    console.log(`${rel(tsconfigPath)}`)
    console.log(`  библиотека: ${pkgAlias}`)
    console.log(`  не хватает подпутей (${missing.length}):`)
    for (const alias of missing) { console.log(`    - ${alias}`) }
    console.log('')
  }

  console.log(
    `Итого: ${findings.length} потребител(ь/я/ей) с неполными paths из ${checkedConsumers} проверенных.`,
  )
  console.log(
    `Добавь недостающие строки в compilerOptions.paths (см. scripts/add-lib-tsconfig-path.mjs) —`,
  )
  console.log(
    `или .claude/rules/libs.md § «Потребителю нужны paths и на транзитивные @letar/*, и на все их подпути».`,
  )
  process.exit(1)
}

main()
