#!/usr/bin/env bun
// Проверяет, что зависимости с намеренным ТОЧНЫМ пином в корневом package.json
// (scripts/intentional-pins.json → pins) не разошлись с той же зависимостью в
// package.json отдельных apps/*/libs/* — под bun isolated linker дедуп с
// корневым бакетом работает ТОЛЬКО при буквальном совпадении строки версии.
//
// Зачем отдельная проверка: check-intentional-pins.mjs сверяет исключительно
// корневой package.json против реестра причин — она не знает, что творится в
// package.json остальных workspace-пакетов. Это другой класс дрейфа: корень
// стабилен, а несколько разных нижестоящих пакетов независимо завели свой
// собственный пин той же зависимости (обычно скопировав версию на момент
// добавления) и со временем разошлись с корнем. Даже caret-диапазон потребителя
// (`^4.4.3`), формально включающий версию корня, резолвится bun isolated linker
// НЕЗАВИСИМО от корневого пина — в максимальную satisfying версию реестра, а не
// в версию корневого бакета. Найдено repo-wide 2026-09-13 на zod: 8 пакетов
// держали разъехавшийся точный пин "4.6.2" при корневом "4.4.3" — TS2769 на
// стыке с @letar/forms без единой строки в bun install/CI по умолчанию.
// Разбор: .claude/docs/zod-per-package-pin-drift.md
//
// Что НЕ проверяется: lockstepGroups (react-native, nx) — они про синхронность
// МЕЖДУ несколькими пакетами корня, а не про потребителей apps/*/libs/*, и в
// apps/libs почти никогда не объявляются напрямую.
//
// Использование: bun scripts/check-pin-drift.mjs
// warn — код возврата всегда 0, это отчёт: на 2026-09-13 долг составлял
// 8 пакетов сразу, блокировать им уже сделанные коммиты одним махом не нужно.
// Поднимать до gate — когда найденный на находке долг будет разгребён и
// подтверждена детерминированность признака (см. .claude/docs/zod-per-package-pin-drift.md).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = 'scripts/intentional-pins.json'
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies']

function readJson(relPath) {
  return JSON.parse(readFileSync(join(repoRoot, relPath), 'utf8'))
}

function isExact(spec) {
  return typeof spec === 'string' && /^\d/.test(spec)
}

function listWorkspacePackageJsons(rootRelDir) {
  const dir = join(repoRoot, rootRelDir)
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const files = []
  for (const e of entries) {
    if (!e.isDirectory()) { continue }
    const pkgPath = join(dir, e.name, 'package.json')
    if (existsSync(pkgPath)) { files.push(pkgPath) }
  }
  return files
}

const registry = readJson(REGISTRY)
const exactRootPins = (registry.pins ?? []).filter((p) => isExact(p.version))

if (exactRootPins.length === 0) {
  console.log('✅ В реестре нет точных пинов с зафиксированной версией — проверять нечего.')
  process.exit(0)
}

const packageJsonFiles = [
  ...listWorkspacePackageJsons('apps'),
  ...listWorkspacePackageJsons('libs'),
]

const findings = [] // { pkg, rootVersion, file, spec, field }
let filesChecked = 0

for (const pkgPath of packageJsonFiles) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    continue
  }
  filesChecked++

  for (const { package: name, version: rootVersion } of exactRootPins) {
    for (const field of FIELDS) {
      const spec = pkg[field]?.[name]
      if (spec === undefined) { continue }
      if (spec === rootVersion) { continue } // буквальное совпадение — дедуп рабочий
      findings.push({ pkg: name, rootVersion, file: pkgPath, spec, field })
    }
  }
}

if (findings.length === 0) {
  console.log(
    `✅ Пакеты, разошедшиеся с корневым намеренным пином, не найдены (проверено ${filesChecked} package.json в apps/libs).`,
  )
  process.exit(0)
}

console.log(`⚠️  ${findings.length} package.json разошлись с корневым намеренным пином:\n`)
for (const { pkg, rootVersion, file, spec, field } of findings) {
  const relFile = relative(repoRoot, file).split('\\').join('/')
  const rangeNote = isExact(spec) ? '' : ' (диапазон — резолвится независимо от корня)'
  console.log(`${pkg}: корень "${rootVersion}", а в ${relFile} (${field}) — "${spec}"${rangeNote}`)
}
console.log(
  '\nФикс — привести версию в затронутом package.json к идентичной точной строке корня\n'
    + '(без ^/~), затем bun install --force из корня, чтобы bun isolated linker задедупил\n'
    + 'изолированную копию в общий корневой бакет.\n'
    + `Разбор: .claude/docs/zod-per-package-pin-drift.md`,
)

// warn: см. шапку файла — накопленный долг, не блокируем существующие коммиты.
process.exit(0)
