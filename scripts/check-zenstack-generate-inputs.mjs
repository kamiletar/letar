#!/usr/bin/env node
// Проверяет, что каждое приложение с таргетом zenstack:generate объявляет Nx полный набор
// того, от чего реально зависит его схема — иначе граф проекта тихо не видит связь и
// nx affected/deploy-by-affected пропускают потребителя после чужой правки.
//
// Три независимых признака, каждый — отдельная находка:
//
//   1. Фрагмент. Если хоть один .zmodel-файл приложения (корневой ИЛИ любой доменный —
//      импорты между .zmodel не транзитивны, см. apps/domwellbes/schema/auth.zmodel) содержит
//      import, ведущий в libs/zenstack-fragments/ — приложению обязательны ДВЕ записи:
//        a) "@letar/zenstack-fragments" в nx.implicitDependencies (package.json ИЛИ
//           project.json — Nx объединяет оба списка, не любой из них по отдельности);
//        b) "{workspaceRoot}/libs/zenstack-fragments/src/*.zmodel" в inputs таргета.
//      Без (a) Nx не помечает приложение affected после правки общего фрагмента, без (b) —
//      тот же прогон zenstack:generate не инвалидируется по кешу (у таргета cache:false,
//      поэтому это не ломает сборку прямо сейчас, но fallback ломается первым же, кто
//      случайно включит кеш).
//
//   2. Доменные файлы схемы. Если у приложения есть свои .zmodel-файлы НЕ в корне (каталог
//      называется по-разному: schema/ у одних, models/ у других — определяем по факту
//      наличия .zmodel в подкаталоге, не по захардкоженному имени) — inputs обязан покрывать
//      этот подкаталог глобом. Без этого правка доменного файла не считается изменением
//      таргета вообще ни для чего (не только для фрагмента).
//
//   3. inputs отсутствует полностью — сам по себе финдинг, независимо от (1) и (2).
//
// Разбор ловушки и история починки шести существующих потребителей вручную —
// .claude/docs/zenstack-shared-fragments-across-apps.md § «Связь фрагмент → приложение
// в графе Nx», PLAN-INFRA-6.md §162/§163.
//
// Использование:
//   node scripts/check-zenstack-generate-inputs.mjs
//
// Exit code 0 — находок нет. Exit code 1 — есть хотя бы одна (список в консоли). Признак
// детерминированный (парсинг import/inputs, не эвристика) — зарегистрирован как gate в
// scripts/check-all.mjs.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const appsDir = path.join(repoRoot, 'apps')

const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

const FRAGMENT_PKG_NAMES = new Set(['@letar/zenstack-fragments', 'zenstack-fragments'])
const FRAGMENT_INPUT_SUBSTRING = 'libs/zenstack-fragments'
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'out', '.turbo', 'coverage', '.git', '.nx', 'src'])

// Обход именно .zmodel-файлов приложения — src/ исключён из обхода намеренно: сгенерированная
// schema.prisma лежит там, а не .zmodel, но пропуск дешевле, чем случайно зацепить чужой
// generated-каталог с похожим именем в будущем.
function walkZmodelFiles(dir, depth = 6) {
  const found = []
  if (depth < 0) { return found }
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return found
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) { continue }
    const fullPath = path.join(dir, entry)
    let stats
    try {
      stats = statSync(fullPath)
    } catch {
      continue
    }
    if (stats.isDirectory()) {
      found.push(...walkZmodelFiles(fullPath, depth - 1))
    } else if (entry.endsWith('.zmodel')) {
      found.push(fullPath)
    }
  }
  return found
}

// import "../../libs/zenstack-fragments/src/better-auth" — только простая форма пути в
// кавычках, ровно то, что используют существующие .zmodel-файлы репозитория.
const IMPORT_RE = /import\s+["']([^"']+)["']/g

function fileImportsFragment(zmodelPath) {
  let text
  try {
    text = readFileSync(zmodelPath, 'utf8')
  } catch {
    return false
  }
  const dir = path.dirname(zmodelPath)
  for (const m of text.matchAll(IMPORT_RE)) {
    const importPath = m[1]
    if (!importPath.startsWith('.')) { continue } // пакетный/абсолютный импорт — не наш случай
    const resolved = path.resolve(dir, importPath).split(path.sep).join('/')
    if (resolved.includes('/libs/zenstack-fragments/')) { return true }
  }
  return false
}

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

// Приватные submodule под apps/ — из .gitmodules, а не по имени каталога (не всякий apps/*
// без project.json — это невыкачанный submodule, это может быть и обычная особенность
// структуры). Нужно только чтобы отличить «нечего проверять, submodule не выкачан» от «этого
// приложения не существует вовсе».
function readPrivateSubmoduleAppPaths() {
  const gitmodulesPath = path.join(repoRoot, '.gitmodules')
  let text
  try {
    text = readFileSync(gitmodulesPath, 'utf8')
  } catch {
    return new Set()
  }
  const names = new Set()
  for (const m of text.matchAll(/^\s*path\s*=\s*(apps\/[^\s]+)\s*$/gm)) {
    names.add(m[1].split('/')[1])
  }
  return names
}

function collectImplicitDeps(appDir) {
  const names = new Set()
  const pkg = readJson(path.join(appDir, 'package.json'))
  for (const d of pkg?.nx?.implicitDependencies ?? []) { names.add(d) }
  const proj = readJson(path.join(appDir, 'project.json'))
  for (const d of proj?.implicitDependencies ?? []) { names.add(d) }
  return names
}

function main() {
  let appNames
  try {
    appNames = readdirSync(appsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    console.log('⚠️  apps/ не найден — пропуск.')
    process.exit(0)
  }

  const privateSubmodulePaths = readPrivateSubmoduleAppPaths()
  const findings = [] // { app, kind, detail }
  let appsWithTarget = 0
  let appsSkippedNotCheckedOut = 0

  for (const app of appNames) {
    const appDir = path.join(appsDir, app)
    const projectJsonPath = path.join(appDir, 'project.json')

    if (!existsSync(projectJsonPath)) {
      // Приватный submodule, не выкачанный в этом окружении (пустой каталог с gitlink) —
      // нечего проверять, но неполное покрытие стоит назвать вслух, если он вообще держит
      // zenstack:generate. Не знаем этого без выкачки — просто считаем его в отчёт о покрытии,
      // если он числится в .gitmodules как submodule под apps/.
      if (privateSubmodulePaths.has(app)) { appsSkippedNotCheckedOut++ }
      continue
    }

    const proj = readJson(projectJsonPath)
    if (!proj?.targets?.['zenstack:generate']) { continue }

    appsWithTarget++
    const target = proj.targets['zenstack:generate']
    const inputs = Array.isArray(target.inputs) ? target.inputs : null

    if (!inputs) {
      findings.push({ app, kind: 'no-inputs', detail: 'таргет zenstack:generate без inputs вообще' })
      // остальные две проверки без inputs всё равно осмысленны — не continue
    }

    // --- 1. Фрагмент ---
    const zmodelFiles = walkZmodelFiles(appDir)
    const rootZmodel = path.join(appDir, 'schema.zmodel')
    const usesFragment = zmodelFiles.some((f) => fileImportsFragment(f))

    if (usesFragment) {
      const implicitDeps = collectImplicitDeps(appDir)
      const hasImplicitDep = [...FRAGMENT_PKG_NAMES].some((n) => implicitDeps.has(n))
      if (!hasImplicitDep) {
        findings.push({
          app,
          kind: 'fragment-missing-implicit-dep',
          detail: '@letar/zenstack-fragments не в nx.implicitDependencies (ни package.json, ни project.json)',
        })
      }
      const hasFragmentInput = (inputs ?? []).some((i) => i.includes(FRAGMENT_INPUT_SUBSTRING))
      if (!hasFragmentInput) {
        findings.push({
          app,
          kind: 'fragment-missing-inputs-entry',
          detail: '{workspaceRoot}/libs/zenstack-fragments/src/*.zmodel отсутствует в inputs',
        })
      }
    }

    // --- 2. Доменные файлы схемы (любой .zmodel не в корне appDir) ---
    const domainSubdirs = new Set()
    for (const f of zmodelFiles) {
      if (f === rootZmodel) { continue }
      const relFromApp = path.relative(appDir, f).split(path.sep).join('/')
      const topSegment = relFromApp.split('/')[0]
      if (topSegment && topSegment !== relFromApp) { domainSubdirs.add(topSegment) }
    }
    for (const subdir of domainSubdirs) {
      const covered = (inputs ?? []).some((i) => i.includes(`{projectRoot}/${subdir}/`) && i.includes('.zmodel'))
      if (!covered) {
        findings.push({
          app,
          kind: 'domain-dir-not-in-inputs',
          detail:
            `подкаталог "${subdir}/" содержит .zmodel, но не покрыт inputs (нужен глоб вида {projectRoot}/${subdir}/**/*.zmodel)`,
        })
      }
    }
  }

  console.log(`Приложений с таргетом zenstack:generate: ${appsWithTarget}`)
  if (appsSkippedNotCheckedOut > 0) {
    console.log(
      `⚠️  ${appsSkippedNotCheckedOut} приложени(е/й) — приватные submodule, не выкачанные в этом окружении (пустые каталоги) — не проверены. Неполное покрытие.`,
    )
  }

  if (findings.length === 0) {
    console.log('✅ Расхождений не найдено.')
    process.exit(0)
  }

  console.log(`\n❌ Найдены расхождения — ${findings.length} шт:\n`)
  for (const { app, kind, detail } of findings) {
    console.log(`${app} [${kind}]`)
    console.log(`  ${detail}`)
    console.log('')
  }
  console.log(
    `Итого: ${findings.length} находок в ${new Set(findings.map((f) => f.app)).size} приложени(и/ях). `
      + `Разбор и рецепт фикса — .claude/docs/zenstack-shared-fragments-across-apps.md § «Связь `
      + `фрагмент → приложение в графе Nx».`,
  )
  process.exit(1)
}

main()
