#!/usr/bin/env node
// Проверяет, что bun.lock после `bun install` — подмножество закоммиченного:
// записи можно удалять, добавлять и менять нельзя.
//
// Зачем: CI не выкачивает приватные submodule, поэтому `bun install --frozen-lockfile`
// там падает (lock ссылается на workspace приватных приложений). Без frozen bun может молча
// поставить другую версию любой зависимости. Эта проверка заменяет frozen: убирать записи
// приватных приложений bun вправе, а новая или изменённая запись — признак дрейфа.
//
// Использование: node scripts/check-lock-subset.mjs [--base <git-ref>] [--lock <путь>]
// Коды возврата: 0 — подмножество, 1 — есть нарушения, 2 — не удалось прочитать данные.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLock } from './check-lock-workspace-versions.mjs'

/** Глубокое равенство для JSON-значений. */
function deepEqual(a, b) {
  if (a === b) { return true }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) { return false }
  if (Array.isArray(a) !== Array.isArray(b)) { return false }
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) { return false }
  return ka.every((k) => k in b && deepEqual(a[k], b[k]))
}

/** Имя пакета из ident вида `name@version` или `@scope/name@version`. */
function pkgName(ident) {
  const at = ident.lastIndexOf('@')
  return at > 0 ? ident.slice(0, at) : ident
}

const SPECIAL_KEYS = new Set(['lockfileVersion', 'configVersion', 'workspaces', 'packages'])

/**
 * Чистая сверка двух разобранных lock-файлов.
 * @returns {{ ok: boolean, violations: string[], removed: { packages: number, workspaces: number, other: number } }}
 */
export function compareLockSubset(baseLock, newLock) {
  const violations = []
  const removed = { packages: 0, workspaces: 0, other: 0 }

  // 1. Версия формата: расхождение значит, что lock записан другой версией bun.
  for (const field of ['lockfileVersion', 'configVersion']) {
    if (baseLock[field] !== newLock[field]) {
      violations.push(
        `lockfile записан другой версией bun: ${field} в lock=${baseLock[field] ?? '—'}, после установки=${
          newLock[field] ?? '—'
        }`,
      )
    }
  }

  // 2. packages: сравниваем по содержимому записи (ident + integrity), не по ключу —
  // bun переподнимает вложенные копии (`a/dep` → `dep`).
  const basePackages = baseLock.packages ?? {}
  const newPackages = newLock.packages ?? {}
  const baseFull = new Set()
  const baseIdents = new Set()
  const baseByName = new Map()
  for (const entry of Object.values(basePackages)) {
    const ident = entry[0]
    baseIdents.add(ident)
    baseFull.add(`${ident}\u0000${entry[3] ?? ''}`)
    const name = pkgName(ident)
    if (!baseByName.has(name)) { baseByName.set(name, []) }
    baseByName.get(name).push(ident)
  }
  for (const [key, entry] of Object.entries(newPackages)) {
    const ident = entry[0]
    const found = entry.length === 1 ? baseIdents.has(ident) : baseFull.has(`${ident}\u0000${entry[3] ?? ''}`)
    if (found) { continue }
    const same = baseByName.get(pkgName(ident))
    const hint = same ? ` (в lock: ${[...new Set(same)].join(', ')})` : ''
    const why = same && same.includes(ident) ? ' — другой integrity' : ''
    violations.push(`+ ${key}: ${ident}${why}${hint}`)
  }
  removed.packages = Math.max(0, Object.keys(basePackages).length - Object.keys(newPackages).length)

  // 3. workspaces: ключи нового — подмножество базы, значения глубоко равны.
  const baseWs = baseLock.workspaces ?? {}
  const newWs = newLock.workspaces ?? {}
  for (const [path, value] of Object.entries(newWs)) {
    const label = path === '' ? '(корень)' : path
    if (!(path in baseWs)) {
      violations.push(`+ workspace ${label}: нет в закоммиченном lock`)
    } else if (!deepEqual(baseWs[path], value)) {
      violations.push(`~ workspace ${label}: запись изменилась`)
    }
  }
  removed.workspaces = Object.keys(baseWs).filter((p) => !(p in newWs)).length

  // 4. Остальные поля верхнего уровня (overrides, patchedDependencies, trustedDependencies…).
  for (const field of new Set([...Object.keys(baseLock), ...Object.keys(newLock)])) {
    if (SPECIAL_KEYS.has(field) || !(field in newLock)) {
      if (!SPECIAL_KEYS.has(field) && field in baseLock) { removed.other++ }
      continue
    }
    if (!(field in baseLock)) {
      violations.push(`+ поле ${field}: нет в закоммиченном lock`)
      continue
    }
    const b = baseLock[field]
    const n = newLock[field]
    const isMap = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
    if (isMap(b) && isMap(n)) {
      for (const [k, v] of Object.entries(n)) {
        if (!(k in b)) { violations.push(`+ ${field}.${k}: нет в закоммиченном lock`) }
        else if (!deepEqual(b[k], v)) { violations.push(`~ ${field}.${k}: значение изменилось`) }
      }
      removed.other += Object.keys(b).filter((k) => !(k in n)).length
    } else if (!deepEqual(b, n)) {
      violations.push(`~ поле ${field}: значение изменилось`)
    }
  }

  return { ok: violations.length === 0, violations, removed }
}

export function parseArgs(argv) {
  const opts = { base: 'HEAD', lock: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') { opts.base = argv[++i] }
    else if (argv[i] === '--lock') { opts.lock = argv[++i] }
  }
  return opts
}

function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const { base, lock } = parseArgs(process.argv.slice(2))
  let baseLock, newLock
  try {
    const baseText = execFileSync('git', ['show', `${base}:bun.lock`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 512 * 1024 * 1024,
    })
    baseLock = parseLock(baseText)
    newLock = parseLock(readFileSync(lock ?? resolve(repoRoot, 'bun.lock'), 'utf8'))
  } catch (e) {
    console.log(`❌ не удалось прочитать bun.lock (база ${base}): ${String(e.message).split('\n')[0]}`)
    process.exit(2)
  }

  const { ok, violations, removed } = compareLockSubset(baseLock, newLock)
  if (ok) {
    const total = removed.packages + removed.workspaces + removed.other
    console.log(
      `bun.lock: установка — подмножество ${base} (удалено записей: ${total}, пакетов: ${removed.packages}, workspace: ${removed.workspaces})`,
    )
    process.exit(0)
  }
  console.log(`❌ bun.lock после установки не подмножество ${base} — ${violations.length} нарушений:`)
  for (const v of violations) { console.log(`   ${v}`) }
  console.log(
    '\nУдалять записи bun вправе, добавлять и менять — нет: это значит, что установка поставила не то, что в закоммиченном lock.',
  )
  process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
