#!/usr/bin/env node
// Проверяет, что @letar/*-пакеты, перечисленные в nx.implicitDependencies
// package.json приложения, но реально импортируемые файлом со своим sibling
// .spec.ts/.test.ts (т.е. уже под vitest), также присутствуют в
// dependencies/devDependencies того же package.json.
//
// Почему это важно: @letar/*-либа резолвится в этом монорепо через
// customConditions (typecheck/сборка Next.js), но vitest — обычным Node-
// резолвером, которому нужен bun-симлинк в node_modules. Симлинк создаёт
// bun install ТОЛЬКО если пакет — настоящая dependency, а не просто запись в
// nx.implicitDependencies. Если файл, импортирующий такой пакет, уже
// покрыт своим spec-файлом — первый прогон, дошедший до этого импорта,
// падает с "Cannot find package '@letar/x'". Найдено и дважды закрыто в
// animatrona, затем ещё в 6 приложениях одним аудитом (2026-09-07). Разбор —
// .claude/docs/vitest-unlinked-workspace-lib-imports.md
//
// Признак взят намеренно узкий (sibling-spec, не "impортируется где-то в
// spec-файле по совпадению имени") — иначе на generic-именах (route.ts,
// index.ts, auth.ts, prisma.ts) регистрируется куча ложных срабатываний.
// Поэтому это warn, не gate: список не исчерпывающий, но каждая найденная
// строка — по-настоящему рискованная связка.
//
// Использование:
//   node scripts/check-implicit-deps.mjs
//
// Exit code всегда 0 — это warn-отчёт для check-all.mjs, не gate.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'out', '.turbo', 'coverage', 'generated', '.git', '.nx'])

function walkTsFiles(dir) {
  const files = []
  function walk(d) {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) { continue }
      const full = path.join(d, e.name)
      if (e.isDirectory()) {
        walk(full)
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        files.push(full)
      }
    }
  }
  walk(dir)
  return files
}

const Q1 = "'"
const Q2 = '"'

function importsPkg(content, pkg) {
  const needles = [
    `from ${Q1}${pkg}${Q1}`,
    `from ${Q2}${pkg}${Q2}`,
    `from ${Q1}${pkg}/`,
    `from ${Q2}${pkg}/`,
    `require(${Q1}${pkg}`,
    `require(${Q2}${pkg}`,
  ]
  return needles.some((n) => content.includes(n))
}

function collectDiscrepancies(appDir) {
  const pkgPath = path.join(appDir, 'package.json')
  if (!existsSync(pkgPath)) { return null }
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return null
  }
  const implicit = pkg.nx?.implicitDependencies
  if (!implicit) { return null }
  const implicitList = Array.isArray(implicit) ? implicit : Object.keys(implicit)
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const missing = implicitList.filter((d) => d.startsWith('@letar/') && !(d in deps))
  return missing.length > 0 ? missing : null
}

function main() {
  const appsDir = path.join(repoRoot, 'apps')
  let appNames
  try {
    appNames = readdirSync(appsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    console.log('⚠️  apps/ не найден — пропуск.')
    process.exit(0)
  }

  const findings = [] // { app, pkg, file, spec }
  let appsChecked = 0
  let appsSkippedNoDeps = 0

  for (const app of appNames) {
    const appDir = path.join(appsDir, app)
    const missing = collectDiscrepancies(appDir)
    if (!missing) { continue }
    appsChecked++

    const allFiles = walkTsFiles(appDir)
    const contents = new Map()
    for (const f of allFiles) {
      try {
        contents.set(f, readFileSync(f, 'utf8'))
      } catch {
        // пропускаем нечитаемое
      }
    }

    for (const pkg of missing) {
      for (const [f, content] of contents) {
        if (/\.(spec|test)\.(ts|tsx)$/.test(f)) { continue }
        if (!/\.ts$/.test(f) || /\.tsx$/.test(f)) { continue } // только "логика", не React-компоненты
        if (!importsPkg(content, pkg)) { continue }

        const specSibling1 = f.replace(/\.ts$/, '.spec.ts')
        const specSibling2 = f.replace(/\.ts$/, '.test.ts')
        const spec = contents.has(specSibling1)
          ? specSibling1
          : contents.has(specSibling2)
          ? specSibling2
          : null
        if (spec) {
          findings.push({ app, pkg, file: f, spec })
        }
      }
    }
  }

  appsSkippedNoDeps = appNames.filter((a) => !existsSync(path.join(appsDir, a, 'package.json'))).length

  if (findings.length === 0) {
    console.log(`✅ Рискованных связок (sibling-spec) не найдено.`)
    console.log(
      `Приложений с расхождением implicitDependencies/dependencies (не обязательно рискованным): ${appsChecked}`,
    )
    if (appsSkippedNoDeps > 0) {
      console.log(
        `⚠️  ${appsSkippedNoDeps} приложени(е/й) — приватные submodule, не выкачанные в этом окружении (пустые каталоги) — не проверены.`,
      )
    }
    process.exit(0)
  }

  console.log(`⚠️  Найдены рискованные @letar/*-пакеты без dependencies — ${findings.length} шт:\n`)
  for (const { app, pkg, file, spec } of findings) {
    console.log(`${app}: ${pkg}`)
    console.log(`  импортируется в ${rel(file)}`)
    console.log(`  покрыт спеком ${rel(spec)} — первый прогон, дошедший до импорта, упадёт с Cannot find package`)
    console.log('')
  }
  console.log(
    `Итого: ${findings.length} связок в ${new Set(findings.map((f) => f.app)).size} приложени(и/ях). `
      + `Фикс — добавить пакет в dependencies того же package.json ("workspace:*") и прогнать bun install. `
      + `Разбор — .claude/docs/vitest-unlinked-workspace-lib-imports.md`,
  )
  // warn: код возврата всегда 0, это отчёт, не gate — признак sibling-spec надёжный,
  // но не исчерпывающий (есть и другие связки риска, не покрытые этой узкой эвристикой).
  process.exit(0)
}

main()
