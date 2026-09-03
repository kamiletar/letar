#!/usr/bin/env bun
// Проверка, что намеренные точные пины версий в корневом package.json стоят
// там, где им положено, и ровно теми версиями, ради которых их поставили.
//
// Зачем: точный пин («"zod": "4.4.3"» вместо «"^4.4.3"») ставится как фикс
// конкретного бага — и с этого момента ничем не отличается от отставшей версии.
// Комментарий в JSON невозможен; комментарии в коде библиотеки объясняют её
// собственный фикс, а не строку в package.json. Ни `bun install`, ни `nx lint`,
// ни `typecheck:tsgo`, ни `nx test` пинов не проверяют. Поэтому обычный
// `/infra:deps-update` снимает такой пин как любую другую отставшую версию:
// именно так `@tanstack/react-devtools@0.10.5` (PLAN-INFRA-4.md §112, коммит
// 175ec47f) был поднят коммитом `9a65abe7 deps update` — и падение прод-сборки
// на `'use' is not exported from 'solid-js/web'` вернулось во все приложения —
// потребители @letar/query-provider (§142). Класс риска описан в
// .claude/docs/root-pin-peer-drift.md.
//
// Что проверяется (источник — scripts/intentional-pins.json):
//   1. `pins`           — пакет стоит ровно указанной версией, без диапазонного
//                         префикса, в указанном поле package.json.
//   2. `lockstepGroups` — все пакеты группы стоят ОДНОЙ точной версией.
//                         Конкретная версия не заморожена: бампы Nx или RN
//                         штатны, ловится расхождение внутри группы и уход
//                         любого участника на диапазон.
//   3. Точные пины, не описанные НИГДЕ в реестре, — печатаются как замечание
//      (код возврата не меняют). Так новый недокументированный пин виден сразу,
//      а давно унаследованные молчат, пока перечислены в `unexplained`.
//
// Использование: bun scripts/check-intentional-pins.mjs
// Код возврата 1 при расхождении с реестром — это gate, а не отчёт.
//
// ⚠️ Проверка НЕ говорит, что пин нужен до сих пор: у каждой записи есть поле
// `unpinWhen` с условием, при котором его можно снимать. Снятие пина — правка
// package.json И удаление записи из реестра одним коммитом, а не подавление
// красной проверки.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = 'scripts/intentional-pins.json'

// Поля package.json, в которых вообще ищем версии.
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies']

function readJson(relPath) {
  return JSON.parse(readFileSync(join(repoRoot, relPath), 'utf8'))
}

// Точный пин — значение, начинающееся с цифры: «4.4.3», «0.87.1»,
// «2.0.0-rc.26», «3.3.0-nightly-20260824-5de6d2358». Всё остальное —
// диапазон (^ ~ >= *), алиас (npm:), workspace/file/git-спецификатор.
function isExact(spec) {
  return typeof spec === 'string' && /^\d/.test(spec)
}

const pkgJson = readJson('package.json')
const registry = readJson(REGISTRY)

// имя пакета → { field, spec } по всем полям, где он объявлен.
const declared = new Map()
for (const field of FIELDS) {
  for (const [name, spec] of Object.entries(pkgJson[field] ?? {})) {
    if (!declared.has(name)) { declared.set(name, []) }
    declared.get(name).push({ field, spec })
  }
}

const problems = []
const okLines = []
// Всё, что реестр так или иначе объясняет, — чтобы отделить неизвестные пины.
const accountedFor = new Set()

// ─── 1. Точные пины с зафиксированной версией ────────────────────────────────

for (const pin of registry.pins ?? []) {
  const { package: name, version, field, reason, doc, unpinWhen } = pin
  accountedFor.add(name)

  const entries = declared.get(name) ?? []
  const lines = []

  if (entries.length === 0) {
    lines.push(`пакета нет в корневом package.json вовсе`)
    lines.push('')
    lines.push('Если он удалён осознанно — удали и запись из реестра тем же коммитом.')
  } else {
    const entry = entries.find((e) => e.field === field) ?? entries[0]

    if (entry.field !== field) {
      lines.push(`ожидался в ${field}, а объявлен в ${entry.field}`)
    }
    if (entry.spec !== version) {
      lines.push(`реестр требует ровно "${version}", в package.json — "${entry.spec}"`)
      if (!isExact(entry.spec)) {
        lines.push('это диапазон, а не пин: версия поедет при первом же `bun update`')
      }
    }
  }

  if (lines.length > 0) {
    problems.push({ title: `${name} (${REGISTRY} → pins)`, lines, reason, doc, unpinWhen })
  } else {
    okLines.push(`${name}@${version} — ${doc}`)
  }
}

// ─── 2. Лок-степ группы: версия свободна, но одна на всех и точная ───────────

for (const group of registry.lockstepGroups ?? []) {
  const { id, packages, reason, doc } = group
  const lines = []
  const seen = new Map() // spec → [имена пакетов]

  for (const name of packages) {
    accountedFor.add(name)
    const entries = declared.get(name) ?? []
    if (entries.length === 0) {
      lines.push(`${name} — нет в корневом package.json`)
      continue
    }
    const spec = entries[0].spec
    if (!seen.has(spec)) { seen.set(spec, []) }
    seen.get(spec).push(name)
  }

  const ranged = [...seen.keys()].filter((s) => !isExact(s))
  for (const spec of ranged) {
    lines.push(`диапазон вместо точной версии: ${seen.get(spec).join(', ')} → "${spec}"`)
  }

  if (seen.size > 1) {
    lines.push('версии внутри группы разошлись:')
    for (const [spec, names] of seen) {
      lines.push(`  "${spec}" — ${names.join(', ')}`)
    }
  }

  if (lines.length > 0) {
    problems.push({
      title: `лок-степ группа «${id}» (${REGISTRY} → lockstepGroups)`,
      lines,
      reason,
      doc,
      unpinWhen: 'Бамп группы штатен — поднимай ВСЕ пакеты группы одной командой и одной версией.',
    })
  } else {
    const [spec] = [...seen.keys()]
    okLines.push(`группа «${id}» — ${packages.length} пакетов на ${spec} — ${doc}`)
  }
}

// ─── 3. Точные пины, которых реестр не знает ─────────────────────────────────

for (const name of Object.keys(registry.unexplained?.packages ?? {})) {
  accountedFor.add(name)
}

const unknownPins = []
for (const [name, entries] of declared) {
  if (accountedFor.has(name)) { continue }
  for (const { field, spec } of entries) {
    if (isExact(spec)) { unknownPins.push({ name, field, spec }) }
  }
}

// ─── Вывод ───────────────────────────────────────────────────────────────────

// Печатается и при зелёном прогоне, и вместе с ошибками: пропустить замечание
// именно тогда, когда реестр и так разошёлся с package.json, — худший момент
// для молчания.
function reportUnknownPins(log) {
  if (unknownPins.length === 0) { return }
  log(
    `\nℹ️  ${unknownPins.length} точн(ый/ых) пин(ов) не описан(ы) в реестре — они не роняют`,
  )
  log('   проверку, но и не защищены ею:')
  for (const { name, field, spec } of unknownPins) {
    log(`   ${name}@${spec} (${field})`)
  }
  log(
    `\n   Заведи запись в ${REGISTRY}: в pins — если пин намеренный, в unexplained —\n`
      + '   если причина неизвестна и пакет стоит вернуть на диапазон при deps-update.',
  )
}

if (problems.length > 0) {
  console.error(`❌ ${problems.length} расхождени(е/я) с реестром намеренных пинов\n`)
  for (const { title, lines, reason, doc, unpinWhen } of problems) {
    console.error(`  ${title}`)
    for (const line of lines) {
      console.error(line ? `    ${line}` : '')
    }
    console.error('')
    console.error(`    Зачем пин стоит: ${reason}`)
    console.error(`    Разбор: ${doc}`)
    if (unpinWhen) {
      console.error(`    Снимать можно, когда: ${unpinWhen}`)
    }
    console.error('')
  }
  console.error(
    'Если пин снят ОСОЗНАННО (условие из «снимать можно, когда» выполнено) — удали\n'
      + `запись из ${REGISTRY} тем же коммитом и опиши в PLAN-INFRA-*, почему причина\n`
      + 'отпала. Красная проверка тут значит «версия уехала сама по себе»: ровно так\n'
      + 'вернулся баг из PLAN-INFRA-4.md §142.',
  )
  reportUnknownPins((line) => console.error(line))
  process.exit(1)
}

console.log(`✅ намеренные пины на месте (${okLines.length}):`)
for (const line of okLines) {
  console.log(`   ${line}`)
}

reportUnknownPins((line) => console.log(line))

process.exit(0)
