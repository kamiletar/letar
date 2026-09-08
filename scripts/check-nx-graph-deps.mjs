#!/usr/bin/env node
// Проверяет, что ВСЕ @letar/*-пакеты, реально импортируемые где-либо в коде
// приложения (src/app/pages/main/renderer/prisma/scripts), объявлены в его
// package.json — либо в dependencies/devDependencies/peerDependencies, либо
// в nx.implicitDependencies.
//
// Почему это важно: дело не в графе Nx — `@nx/js` строит рёбра парсингом самих
// TS-импортов, и `nx affected` корректно видит потребителя затронутым даже без
// записи в dependencies/implicitDependencies (см. nx-affected-source-based-inference.md,
// PLAN-INFRA-6.md §169). Настоящая причина — bun: изолированный линковщик создаёт
// симлинк `node_modules/@letar/<lib>` только по записи в `dependencies`,
// `implicitDependencies` для bun невидим. Без симлинка падает резолв мимо
// tsconfig.paths — `typecheck:tsgo`, vitest через sibling-spec. Регрессия в
// библиотеке молча доезжает до прод-сборки приложения, минуя typecheck/тесты
// этого приложения.
//
// Отличие от check-implicit-deps.mjs: та проверка — узкая и про один конкретный
// симптом (пакет ТОЛЬКО в implicitDependencies без dependencies, что рвёт
// vitest-резолвер через sibling-spec). Эта проверка — про полноту dependencies
// вообще, любой отсутствующий импорт, а не только сценарий vitest.
//
// Найдено на animatrona-tracker (2026-09-08): 8 из 17 импортируемых
// @letar/*-библиотек не были объявлены нигде. Тот же замер по всем apps/*
// показал разрыв у 22 из 56 приложений (~39%) — не редкое исключение.
// PLAN-INFRA.md §169.
//
// warn, не gate: долг слишком большой (22 приложения) для немедленного gate
// без отдельной сессии на разгребание — см. прецедент transpile-packages
// (тоже стал gate только после того, как долг был закрыт). Поднять до gate
// после того, как список ниже станет пустым на чистом дереве.
//
// Использование:
//   node scripts/check-nx-graph-deps.mjs
//
// Exit code всегда 0 — warn-отчёт для check-all.mjs, не gate.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { walk } from './lib/fs-walk.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts'])
const SCAN_SUBDIRS = ['src', 'app', 'pages', 'main', 'renderer', 'prisma', 'scripts']
const IMPORT_RE = /(?:from\s+|require\(\s*|import\(\s*)['"](@letar\/[a-zA-Z0-9_-]+)(?:\/[^'"]*)?['"]/g

function collectImported(appDir) {
  const bases = new Set()
  for (const sub of SCAN_SUBDIRS) {
    const dir = path.join(appDir, sub)
    if (!existsSync(dir)) { continue }
    const files = walk(dir, (entry) => SOURCE_EXTS.has(path.extname(entry)), 20)
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
  }
  return bases
}

function collectDeclared(pkg) {
  const declared = new Set()
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const name of Object.keys(pkg[key] ?? {})) {
      if (name.startsWith('@letar/')) { declared.add(name) }
    }
  }
  const implicit = pkg.nx?.implicitDependencies
  if (implicit) {
    const list = Array.isArray(implicit) ? implicit : Object.keys(implicit)
    for (const name of list) {
      if (name.startsWith('@letar/')) { declared.add(name) }
    }
  }
  return declared
}

function main() {
  const appsDir = path.join(repoRoot, 'apps')
  let appNames
  try {
    appNames = readdirSync(appsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    console.log('⚠️  apps/ не найден — пропуск.')
    process.exit(0)
  }

  const findings = [] // { app, missing: string[] }
  let checked = 0
  let skippedNoPkg = 0

  for (const app of appNames) {
    const appDir = path.join(appsDir, app)
    const pkgPath = path.join(appDir, 'package.json')
    if (!existsSync(pkgPath)) {
      skippedNoPkg++
      continue
    }
    let pkg
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    } catch {
      continue
    }
    checked++

    const imported = collectImported(appDir)
    if (imported.size === 0) { continue }
    const declared = collectDeclared(pkg)
    const missing = [...imported].filter((name) => !declared.has(name)).sort()
    if (missing.length > 0) {
      findings.push({ app, missing })
    }
  }

  if (findings.length === 0) {
    console.log(`✅ Разрывов графа Nx не найдено. Приложений проверено: ${checked}.`)
    if (skippedNoPkg > 0) {
      console.log(`⚠️  ${skippedNoPkg} приложени(е/й) без package.json (приватные submodule, не выкачаны) — не проверены.`)
    }
    process.exit(0)
  }

  console.log(`⚠️  Импортируемые @letar/*-пакеты не объявлены ни в dependencies, ни в nx.implicitDependencies — ${findings.length} приложени(е/я/й) из ${checked}:\n`)
  for (const { app, missing } of findings) {
    console.log(`${app} (${missing.length}):`)
    for (const name of missing) { console.log(`    - ${name}`) }
    console.log('')
  }
  console.log(
    `Фикс — добавить недостающие пакеты в dependencies того же package.json ("workspace:*") `
      + `и прогнать bun install. Разбор — PLAN-INFRA.md §169.`,
  )
  // warn: код возврата всегда 0 — это отчёт накопленного долга, не gate.
  // См. комментарий в шапке файла про условие поднятия до gate.
  process.exit(0)
}

main()
