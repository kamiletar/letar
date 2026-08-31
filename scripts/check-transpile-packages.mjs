#!/usr/bin/env node
// Проверяет, что `transpilePackages` в next.config.* каждого приложения содержит
// ВСЕ пакеты @letar/*, которые реально импортируются где-то в src/ этого
// приложения — а не только те, что были нужны на момент миграции с withNx.
//
// Почему это важно: после ухода от @nx/next composePlugins/withNx (PLAN.md §73,
// .claude/docs/nextjs-nx-composeplugins-migration.md) синхронизацию
// transpilePackages с графом зависимостей Nx делал withNx автоматически (пусть и
// не всегда успешно). Теперь список — статический литерал, вычисленный вручную на
// момент миграции. Добавил новый импорт из libs/* → забыл добавить и в
// tsconfig.json paths, и в next.config transpilePackages → при сборке через
// --webpack получаешь `Module parse failed: Unexpected token` на первом же
// `interface`/`export type` внутри библиотеки — без единой ошибки от typecheck
// или lint (tsgo резолвит paths корректно независимо от transpilePackages).
//
// Использование:
//   node scripts/check-transpile-packages.mjs
//
// Exit code 0 — расхождений нет. Exit code 1 — найдены импортируемые пакеты,
// отсутствующие в transpilePackages (список выводится в консоль).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { walk } from './lib/fs-walk.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

const NEXT_CONFIG_NAMES = new Set(['next.config.js', 'next.config.mjs', 'next.config.ts'])
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

// --- 1. Находим все next.config.* внутри apps/ (включая приватные submodule) ---

function findNextConfigs(appsDir) {
  return walk(appsDir, (entry) => NEXT_CONFIG_NAMES.has(entry), 3).sort()
}

// transpilePackages — литерал внутри произвольного JS/TS, не JSON — парсим
// регуляркой по строковым литералам внутри массива, как и остальные ad-hoc
// разборы конфигов в этом репозитории (next.config не импортируем напрямую:
// он может тянуть next-intl/plugin и другие ESM-only зависимости).
function extractTranspilePackages(configPath) {
  const text = readFileSync(configPath, 'utf8')
  const match = text.match(/transpilePackages\s*:\s*\[([\s\S]*?)\]/)
  if (!match) { return null }
  const body = match[1]
  const names = [...body.matchAll(/['"](@letar\/[a-zA-Z0-9_-]+)['"]/g)].map((m) => m[1])
  return new Set(names)
}

// --- 2. Базовые имена @letar/* пакетов из tsconfig.json приложения ---

function readTsconfigLetarBases(tsconfigPath) {
  let text
  try {
    text = readFileSync(tsconfigPath, 'utf8')
  } catch {
    return null
  }
  const result = ts.parseConfigFileTextToJson(tsconfigPath, text)
  if (result.error || !result.config) { return null }
  const paths = result.config.compilerOptions?.paths ?? result.config.paths
  if (!paths || typeof paths !== 'object') { return new Set() }

  const bases = new Set()
  for (const key of Object.keys(paths)) {
    if (!key.startsWith('@letar/')) { continue }
    const base = key.split('/').slice(0, 2).join('/') // "@letar/forms-core/schema" -> "@letar/forms-core"
    bases.add(base)
  }
  return bases
}

// --- 3. Реально импортируемые @letar/* пакеты внутри src/ ---

const IMPORT_RE = /(?:from\s+|require\(\s*|import\(\s*)['"](@letar\/[a-zA-Z0-9_-]+)(?:\/[^'"]*)?['"]/g

function collectImportedBases(srcDir) {
  const files = walk(srcDir, (entry) => SOURCE_EXTS.has(path.extname(entry)), 20)
  const bases = new Set()
  for (const file of files) {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const m of text.matchAll(IMPORT_RE)) {
      bases.add(m[1])
    }
  }
  return bases
}

// --- 4. Сверяем ---

function main() {
  const appsDir = path.join(repoRoot, 'apps')
  const configs = findNextConfigs(appsDir)

  const findings = [] // { configPath, missing: string[] }
  let checkedApps = 0

  for (const configPath of configs) {
    const transpiled = extractTranspilePackages(configPath)
    if (!transpiled) { continue } // приложение без transpilePackages — вне охвата этой проверки

    const appDir = path.dirname(configPath)
    const tsconfigPath = path.join(appDir, 'tsconfig.json')
    const tsconfigBases = readTsconfigLetarBases(tsconfigPath)
    if (!tsconfigBases || tsconfigBases.size === 0) { continue } // нет tsconfig.json или в нём нет @letar/*-алиасов

    const srcDir = path.join(appDir, 'src')
    const imported = collectImportedBases(srcDir)
    if (imported.size === 0) { continue } // нет src/ или в нём нет @letar/*-импортов вообще

    // Проверяем только алиасы, реально прописанные в tsconfig.json paths — это тот же пул
    // кандидатов, который withNx раньше вычислял через граф Nx + tsconfig-алиасы (см.
    // .claude/docs/nextjs-nx-composeplugins-migration.md). Пакет, импортируемый без записи в
    // paths (резолвится через customConditions/node_modules-симлинк bun, см. .claude/rules/libs.md
    // «paths — вспомогательные, не обязательные») — вне охвата этой проверки.
    checkedApps++
    const candidates = [...imported].filter((base) => tsconfigBases.has(base))
    const missing = candidates.filter((base) => !transpiled.has(base)).sort()
    if (missing.length > 0) {
      findings.push({ configPath, missing, tsconfigPath })
    }
  }

  if (findings.length === 0) {
    console.log(`✅ Расхождений не найдено.`)
    console.log(`next.config.* с transpilePackages: проверено ${checkedApps} из ${configs.length} найденных.`)
    process.exit(0)
  }

  console.log(`❌ Найдены пакеты, импортируемые в src/, но отсутствующие в transpilePackages — ${findings.length} приложени(е/я/й):\n`)
  for (const { configPath, missing } of findings) {
    console.log(`${rel(configPath)}`)
    console.log(`  не хватает в transpilePackages (${missing.length}):`)
    for (const base of missing) { console.log(`    - ${base}`) }
    console.log('')
  }

  console.log(
    `Итого: ${findings.length} приложени(е/я/й) с неполным transpilePackages из ${checkedApps} проверенных.`,
  )
  console.log(
    `Добавь недостающие пакеты в массив transpilePackages next.config.* —`,
  )
  console.log(
    `см. .claude/docs/nextjs-nx-composeplugins-migration.md.`,
  )
  process.exit(1)
}

main()
