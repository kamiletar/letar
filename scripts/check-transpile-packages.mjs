#!/usr/bin/env node
// Проверяет `transpilePackages` в next.config.* каждого приложения на ДВА
// НЕЗАВИСИМЫХ по тяжести класса расхождения с реально импортируемыми в src/
// пакетами @letar/* (взятыми из paths tsconfig.json приложения):
//
//   1. КРИТИЧНО, build-breaking: ключ `transpilePackages` отсутствует в
//      next.config.* ЦЕЛИКОМ, а приложение импортирует внешние @letar/*-пакеты.
//      В next/dist/build/webpack-config.js (16.3.4, строки 382–396) выражение
//      `shouldIncludeExternalDirs = config.experimental.externalDir ||
//      !!config.transpilePackages` читает только НАЛИЧИЕ ключа — снимает
//      ограничение `include: [dir]` webpack-резолвера. bun линкует workspace-либы
//      симлинком (apps/<app>/node_modules/@letar/x -> ../../../../libs/x/),
//      webpack резолвит символьную ссылку в реальный путь `libs/…` БЕЗ
//      `node_modules` в нём — без снятого `include` такой файл никогда не
//      попадёт в SWC-компиляцию, и прод-сборка (`next build --webpack`) падает
//      `Module parse failed: Unexpected token` на первом же `.ts`-синтаксисе
//      снаружи `apps/<app>/src`. Найдено и починено на apps/form-example
//      (2026-09-15, падал на libs/glitchtip/src/client/index.ts).
//   2. Соглашение о единообразии (НЕ build-breaking): ключ есть, но КОНКРЕТНЫЙ
//      импортируемый пакет в списке не перечислен. `next` до содержимого массива
//      в этом случае не доходит вовсе — `isResourceInPackages` не участвует в
//      решении, симлинк уже снял `include` ключом как таковым. Отсутствие записи
//      о конкретном пакете сборку НЕ ломает — это дрейф литерала, вычисленного
//      вручную на момент миграции с @nx/next withNx (PLAN.md §73,
//      .claude/docs/nextjs-nx-composeplugins-migration.md), от которого больше
//      никто не синхронизирует список автоматически.
//
// Оба случая разобраны и замерены — .claude/docs/transpile-packages-array-presence-not-content.md.
// Пустой массив `transpilePackages: []` НЕ считается классом 1 — `!![]` истинно,
// снимает `include` ровно как непустой список (см. `extractTranspilePackages`:
// возвращает пустой `Set`, отличимый от `null` — ключа нет вовсе).
//
// Использование:
//   node scripts/check-transpile-packages.mjs
//
// Exit code 0 — расхождений не найдено ни одного класса.
// Exit code 1 — найден хотя бы один случай класса 1 (критично) и/или класса 2
// (список неполон); при exit 1 всегда выводится, к какому классу относится
// каждая находка — не путать критичное с соглашением при разборе красного прогона.

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

  const criticalFindings = [] // { configPath, imported: string[] } — ключа нет вовсе, build-breaking
  const findings = [] // { configPath, missing: string[] } — ключ есть, список неполон
  let checkedApps = 0

  for (const configPath of configs) {
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
    const candidates = [...imported].filter((base) => tsconfigBases.has(base))
    if (candidates.length === 0) { continue } // импорты есть, но ни один не внешний @letar-алиас

    checkedApps++

    // extractTranspilePackages различает «ключа нет вовсе» (null) от «ключ есть,
    // возможно пустой массив» (Set, в т.ч. пустой) — это ровно граница между
    // классом 1 (build-breaking) и классом 2 (неполный список) из шапки файла.
    const transpiled = extractTranspilePackages(configPath)
    if (transpiled === null) {
      criticalFindings.push({ configPath, imported: candidates.sort() })
      continue
    }

    const missing = candidates.filter((base) => !transpiled.has(base)).sort()
    if (missing.length > 0) {
      findings.push({ configPath, missing, tsconfigPath })
    }
  }

  if (criticalFindings.length === 0 && findings.length === 0) {
    console.log(`✅ Расхождений не найдено.`)
    console.log(
      `next.config.* приложений с внешними @letar/*-импортами: проверено ${checkedApps} из ${configs.length} найденных.`,
    )
    process.exit(0)
  }

  if (criticalFindings.length > 0) {
    console.log(
      `🔴 КРИТИЧНО (build-breaking): ключ transpilePackages отсутствует ЦЕЛИКОМ, хотя приложение импортирует внешние @letar/*-пакеты — ${criticalFindings.length} приложени(е/я/й):\n`,
    )
    for (const { configPath, imported } of criticalFindings) {
      console.log(`${rel(configPath)}`)
      console.log(`  импортирует, но ключа transpilePackages нет вовсе (${imported.length}):`)
      for (const base of imported) { console.log(`    - ${base}`) }
      console.log('')
    }
    console.log(
      `Прод-билд (next build --webpack) упадёт «Module parse failed» на первом же .ts-синтаксисе`,
    )
    console.log(
      `снаружи apps/<app>/src — добавь ключ transpilePackages: ['<любой из списка выше>', ...] в next.config.*.`,
    )
    console.log(
      `Разбор — .claude/docs/transpile-packages-array-presence-not-content.md.\n`,
    )
  }

  if (findings.length > 0) {
    console.log(
      `⚠️ Неполнота списка (соглашение, НЕ поломка сборки) — ${findings.length} приложени(е/я/й):\n`,
    )
    for (const { configPath, missing } of findings) {
      console.log(`${rel(configPath)}`)
      console.log(`  не хватает в transpilePackages (${missing.length}):`)
      for (const base of missing) { console.log(`    - ${base}`) }
      console.log('')
    }
    console.log(
      `Добавь недостающие пакеты в массив transpilePackages next.config.* — это дрейф соглашения,`,
    )
    console.log(
      `ключ уже присутствует и include уже снят, отсутствие конкретной записи сборку не ломает.`,
    )
    console.log(
      `Разбор — .claude/docs/transpile-packages-array-presence-not-content.md.\n`,
    )
  }

  console.log(
    `Итого: ${criticalFindings.length} критичн(ая/ых) + ${findings.length} неполн(ая/ых) из ${checkedApps} проверенных.`,
  )
  process.exit(1)
}

main()
