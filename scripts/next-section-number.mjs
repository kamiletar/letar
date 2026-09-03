#!/usr/bin/env bun
// next-section-number.mjs — печатает следующий свободный номер §NN для того семейства
// журналов, которому принадлежит указанный файл.
//
// ⚠️ Два НЕЗАВИСИМЫХ счётчика, не один общий:
//   - INFRA:   PLAN-INFRA.md, PLAN-INFRA-1.md … PLAN-INFRA-N.md
//   - JOURNAL: PLAN.md, PLAN-JOURNAL-1.md … PLAN-JOURNAL-N.md
// Оба выросли из одного файла (PLAN.md был разрезан на «auth-журнал» и «инфра-треки» —
// см. шапку PLAN-INFRA.md), поэтому их диапазоны §NN исторически пересекаются
// (например §29 есть и в PLAN-INFRA-2.md, и в PLAN-JOURNAL-1.md — это два РАЗНЫХ раздела,
// не дубль). Смешивать их в один список при поиске максимума — верный способ насчитать
// несуществующие коллизии; отсюда обязательный аргумент <file>, определяющий семейство.
//
// ПОЧЕМУ ЭТО НЕ УСТРАНЯЕТ ГОНКУ ЦЕЛИКОМ: это не блокировка, а дешёвый источник свежего
// чтения. Root cause коллизий §NN — не одновременное чтение (два агента редко читают файл
// в одну и ту же миллисекунду), а то, что номер вычисляется РАНО в сессии (в начале
// работы над секцией) и кэшируется в голове агента до момента вставки, который может
// наступить спустя долгое время — а за это время другая сессия успевает вставить свою
// секцию с тем же номером. Вызов этого скрипта прямо ПЕРЕД вставкой (не в начале работы
// над задачей) закрывает часть окна, но не всё: барьер, который ловит уже случившуюся
// коллизию перед коммитом, — scripts/check-section-numbers.mjs через
// scripts/hooks/pre-commit-section-number-check.sh.
//
// Использование:
//   bun scripts/next-section-number.mjs PLAN-INFRA-6.md             # печатает: 150
//   bun scripts/next-section-number.mjs PLAN-JOURNAL-2.md --verbose  # + известные дубли внутри семейства
//
// Использует Bun.spawnSync (не node:child_process), как остальные хелперы в scripts/.

import fs from 'node:fs'
import path from 'node:path'

const FAMILIES = [
  { name: 'INFRA', member: /^PLAN-INFRA(-\d+)?\.md$/ },
  { name: 'JOURNAL', member: /^(PLAN|PLAN-JOURNAL-\d+)\.md$/ },
]

function repoRoot() {
  const result = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], { stdout: 'pipe' })
  return result.stdout.toString('utf8').trim()
}

function familyFor(fileBaseName) {
  return FAMILIES.find((f) => f.member.test(fileBaseName)) ?? null
}

function listFamilyFiles(root, family) {
  return fs
    .readdirSync(root)
    .filter((name) => family.member.test(name))
    .sort()
}

function extractHeaders(text, file) {
  const out = []
  const lines = text.split('\n')
  const headerRe = /^## §(\d+(?:\.\d+)*)\b/
  for (let i = 0; i < lines.length; i++) {
    const m = headerRe.exec(lines[i])
    if (m) { out.push({ number: m[1], file, line: i + 1, text: lines[i] }) }
  }
  return out
}

function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose')
  const target = args.find((a) => !a.startsWith('--'))

  if (!target) {
    console.error('Использование: bun scripts/next-section-number.mjs <PLAN*.md> [--verbose]')
    console.error('Пример: bun scripts/next-section-number.mjs PLAN-INFRA-6.md')
    process.exit(1)
  }

  const baseName = path.basename(target)
  const family = familyFor(baseName)
  if (!family) {
    console.error(`⚠️  "${baseName}" не относится ни к одному известному семейству (INFRA / JOURNAL).`)
    console.error('    Если завёл новую часть по новому шаблону имени — обнови FAMILIES в этом скрипте.')
    process.exit(1)
  }

  const root = repoRoot()
  const files = listFamilyFiles(root, family)

  const all = []
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8')
    all.push(...extractHeaders(text, file))
  }

  let maxInt = 0
  let maxSource = null
  for (const h of all) {
    const intPart = Math.trunc(Number.parseFloat(h.number))
    if (intPart > maxInt) {
      maxInt = intPart
      maxSource = h
    }
  }

  const next = maxInt + 1

  if (verbose) {
    console.error(`Семейство ${family.name} (${files.length}): ${files.join(', ')}`)
    if (maxSource) {
      console.error(`Максимум найден в ${maxSource.file}:${maxSource.line} — "${maxSource.text.trim()}"`)
    }

    const byNumber = new Map()
    for (const h of all) {
      if (!byNumber.has(h.number)) { byNumber.set(h.number, []) }
      byNumber.get(h.number).push(h)
    }
    const dups = [...byNumber.entries()].filter(([, list]) => list.length > 1)
    if (dups.length > 0) {
      console.error(
        `⚠️  Уже существующие дубли §NN внутри семейства ${family.name} (${dups.length}) — этот скрипт их не чинит:`,
      )
      for (const [number, list] of dups) {
        console.error(`  §${number}: ${list.map((h) => `${h.file}:${h.line}`).join(', ')}`)
      }
    }
    console.error('')
  }

  console.log(String(next))
}

main()
