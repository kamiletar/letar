#!/usr/bin/env bun
// Проверяет, что блок `workspaces` в bun.lock совпадает с package.json каждого
// workspace-пакета: поле `version`, четыре карты зависимостей и состав самих
// workspace-путей.
//
// Зачем: `bun install --frozen-lockfile` на сервере (deploy-affected.sh) падает
// при ЛЮБОМ расхождении — даже когда «разошлась» одна строка version у пакета,
// который деплой вообще не касается. Падает не приложение-виновник, а вся очередь
// деплоев сразу. Ни typecheck, ни lint, ни build локально этого не видят — только
// сам bun и только на сервере (.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md).
//
// Три источника дрейфа, ни один из которых не ловится обычным воркфлоу:
//   1. Бамп `version` в package.json (app-workflow.md § «После завершения задачи»,
//      шаг 5) без последующего `bun install` — самый частый.
//   2. Бамп версии ВНУТРИ приватного submodule: `bun.lock` живёт в корне letar, а
//      submodule — отдельный репозиторий; коммит в нём физически не может включить
//      правку корневого lock. Следом идёт `chore: bump <submodule>` в letar, и
//      lock обновляют, только если про него вспомнят.
//   3. `bun install`, запущенный в дереве с чужим незакоммиченным WIP, записывает в
//      lock ЧУЖОЕ состояние (2026-09-21: libs/deploy-mcp получил 0.4.1 при
//      package.json 0.5.0 — lock оказался хуже коммитного). Поэтому эта проверка
//      сверяет lock именно с package.json, а не со «свежим bun install».
//
// Что НЕ проверяется: раздел `packages` (резолв внешних зависимостей) — он
// меняется только реальным `bun install` и от дрейфа version не страдает.
//
// Использование: bun scripts/check-lock-workspace-versions.mjs
// Код возврата 1 — есть расхождения. Отсутствующий на диске package.json (приватный
// submodule не выкачан, обычно CI) — не ошибка, но печатается вслух: молчаливый
// пропуск читался бы как «проверено и чисто» (.claude/docs/verification-pitfalls.md).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

/** bun.lock — JSONC: хвостовые запятые. Срезаем их перед JSON.parse. */
function parseLock(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'))
}

/** Workspace-глобы корня (`apps/*`, `libs/*`) → относительные пути каталогов с package.json. */
function discoverWorkspaces(rootPkg) {
  const found = new Set()
  for (const glob of rootPkg.workspaces ?? []) {
    if (!glob.endsWith('/*')) { continue }
    const base = glob.slice(0, -2)
    let entries
    try {
      entries = readdirSync(join(repoRoot, base), { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (e.isDirectory() && existsSync(join(repoRoot, base, e.name, 'package.json'))) {
        found.add(`${base}/${e.name}`)
      }
    }
  }
  return found
}

function diffDeps(pkgDeps = {}, lockDeps = {}) {
  const out = []
  for (const name of new Set([...Object.keys(pkgDeps), ...Object.keys(lockDeps)])) {
    if (pkgDeps[name] !== lockDeps[name]) {
      out.push(`${name}: package.json=${pkgDeps[name] ?? '—'} lock=${lockDeps[name] ?? '—'}`)
    }
  }
  return out
}

const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
const lock = parseLock(readFileSync(join(repoRoot, 'bun.lock'), 'utf8'))
const lockWorkspaces = lock.workspaces ?? {}

const problems = []
const skipped = []

for (const [path, entry] of Object.entries(lockWorkspaces)) {
  const pkgPath = join(repoRoot, path, 'package.json')
  if (!existsSync(pkgPath)) {
    skipped.push(path)
    continue
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const label = path === '' ? '(корень)' : path

  // Корень bun в блоке workspaces пишет без version всегда — это не расхождение.
  if (path !== '' && pkg.version !== entry.version) {
    problems.push(`${label}: version package.json=${pkg.version ?? '—'} lock=${entry.version ?? '—'}`)
  }
  for (const field of DEP_FIELDS) {
    for (const line of diffDeps(pkg[field], entry[field])) {
      problems.push(`${label}: ${field} — ${line}`)
    }
  }
}

// Workspace есть на диске, а в lock его нет (новый пакет без `bun install`).
for (const path of discoverWorkspaces(rootPkg)) {
  if (!(path in lockWorkspaces)) {
    problems.push(`${path}: package.json есть, записи в bun.lock нет`)
  }
}

if (skipped.length > 0) {
  console.log(
    `ℹ️  не проверено ${skipped.length} workspace (package.json не выкачан — приватный submodule?): `
      + skipped.join(', '),
  )
}

if (problems.length === 0) {
  console.log(
    `✅ bun.lock согласован с package.json (${Object.keys(lockWorkspaces).length - skipped.length} workspace)`,
  )
  process.exit(0)
}

console.log(`❌ bun.lock расходится с package.json — ${problems.length} расхождений:`)
for (const p of problems) { console.log(`   • ${p}`) }
console.log(`
Деплой ЛЮБОГО приложения упадёт на \`bun install --frozen-lockfile\` (весь workspace, не одно приложение).
Что делать: bun install --lockfile-only  — но ТОЛЬКО в чистом дереве. В дереве с чужим WIP lock
запишет чужие версии (там это уже случалось); сверяй диф lock построчно с package.json.
Если расхождение из-за bump'а внутри приватного submodule — сначала запушь submodule
(bash scripts/check-submodule-push-state.sh), lock коммить только вместе с уже валидным SHA.
Разбор: .claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md`)
process.exit(1)
