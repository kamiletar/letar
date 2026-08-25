#!/usr/bin/env bun
// Проверка peer-зависимостей между корневыми пакетами после `bun install`.
//
// Зачем: bun 1.3.14 не печатает предупреждения о несовпадении peerDependencies
// ни в обычном, ни в `--verbose`, ни в форсированном (`--force`) режиме —
// проверено эмпирически (PLAN-INFRA-4.md §104/§105). Поэтому расхождение между
// точным пином одного корневого пакета и peerDependencies другого корневого
// пакета копится незаметно: routine `bun update`/`bun add` не обязаны его
// заметить. Разбор класса — .claude/docs/root-pin-peer-drift.md.
//
// Что делает: читает bun.lock (JSONC — используется его текстовый формат
// lockfileVersion 1, допускающий висячие запятые), для каждого корневого
// пакета (dependencies+devDependencies package.json) с непустым
// peerDependencies проверяет остальные корневые пакеты на совпадение через
// встроенный Bun.semver. Смотрит только на топ-уровневую (хоистящуюся) версию
// peer-пакета в дереве — это то же дерево, что фактически резолвит `bun
// install` для корневых импортов.
//
// Что НЕ делает: не проверяет вложенные/задублированные копии пакетов
// (@foo/bar с несколькими физическими версиями в дереве) — там уже
// существующий фоновый шум из несвязанных peer-диапазонов (например
// eslint-plugin-* против eslint 10.x), который проверять смысла нет: bun сам
// это резолвит без дублирования копий, а полными деревьями шум
// нерелевантных предупреждений топит единичный настоящий сигнал.
//
// Использование: bun scripts/check-peer-deps.mjs
// Код возврата всегда 0 — это информационный отчёт для человека в конце
// deps-update сессии, не gate для CI.

import { readFileSync } from 'node:fs'

const pkgJson = JSON.parse(readFileSync('package.json', 'utf8'))
const rootNames = new Set([
  ...Object.keys(pkgJson.dependencies ?? {}),
  ...Object.keys(pkgJson.devDependencies ?? {}),
])

const lockText = readFileSync('bun.lock', 'utf8').replace(/,(\s*[}\]])/g, '$1')
const { packages } = JSON.parse(lockText)

function topLevelVersion(name) {
  const tuple = packages[name]
  if (!tuple) { return null }
  const spec = tuple[0]
  return spec.slice(spec.lastIndexOf('@') + 1)
}

const problems = []
for (const consumer of rootNames) {
  const tuple = packages[consumer]
  if (!tuple) { continue }
  const meta = tuple[2]
  if (!meta || typeof meta !== 'object' || !meta.peerDependencies) { continue }
  const optional = new Set(meta.optionalPeers ?? [])
  for (const [peerName, range] of Object.entries(meta.peerDependencies)) {
    if (optional.has(peerName)) { continue }
    if (!rootNames.has(peerName)) { continue }
    const have = topLevelVersion(peerName)
    if (!have) { continue }
    if (!Bun.semver.satisfies(have, range)) {
      problems.push({ consumer, peerName, range, have })
    }
  }
}

if (problems.length === 0) {
  console.log('✅ peer-зависимости между корневыми пакетами согласованы')
  process.exit(0)
}

console.log(`⚠️  ${problems.length} несовпадений peerDependencies между корневыми пакетами:\n`)
for (const { consumer, peerName, range, have } of problems) {
  console.log(`  ${consumer} требует ${peerName}@${range}, установлен ${have}`)
}
console.log(
  '\nЧасть этого списка — известный фоновый шум (например eslint 10.x против '
    + 'старых eslint-plugin-*), не обязательно чинить каждую строку. Смотри, не '
    + 'появилась ли НОВАЯ строка после этого прогона `bun update`/`bun add` — '
    + 'именно так тихо накопились §104/§105 в PLAN-INFRA-4.md.',
)
