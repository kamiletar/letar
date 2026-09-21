#!/usr/bin/env node
// Сторож синхронности двух намеренных копий регулярок таблицы маршрутов Next.js
// (PLAN-INFRA-6.md §157).
//
// Контекст: таблицу «Route (app)» … легенда «(Static)/(SSG)/(Dynamic)» из лога деплоя
// распознают две независимые копии одних и тех же трёх констант:
//   - apps/dashboard-agent/src/lib/deploy-route-table.ts — захват блока в DeployStatus.routeTables
//     прямо в потоке лога;
//   - libs/deploy-mcp/src/log-tools.ts — разбор лога и запасной путь, когда агент старше 0.18.1.
// dashboard-agent собирается изолированно от монорепо (Dockerfile.production) и не может импортировать
// из libs/, поэтому дубль сделан намеренно — выносить в общую библиотеку нельзя, изоляция агента важнее.
//
// Риск, который закрывает сторож: Next.js поменяет формат вывода (значки, заголовок, легенду), кто-то
// поправит регулярку в одной копии — и агент с deploy-mcp молча разойдутся: агент сохранит один блок,
// а deploy-mcp будет искать другой. Ни typecheck, ни lint, ни тесты каждой стороны такое не ловят —
// у каждой свой набор фикстур, зелёный по построению.
//
// Что проверяется: ИСХОДНЫЙ ТЕКСТ литералов констант ROUTE_HEADER_RE, LEGEND_RE, BLANK_RE (тело и
// флаги) совпадает в обеих копиях дословно. Сравнение текстовое, а не поведенческое: две регулярки,
// эквивалентные по смыслу, но записанные по-разному (другой порядок альтернатив), тоже считаются
// расхождением — так правку нельзя сделать «наполовину», а следующий читатель видит две одинаковые
// строки и не гадает, одно и то же они значат или нет.
//
// Ошибкой считается и то, что не даёт сравнить: константа не найдена (переименована — поправь список
// CONSTANTS ниже вместе с переименованием), объявлена дважды, литерал не закрыт или не компилируется
// как RegExp, файла нет. Молчаливая зелень на потерянной константе читалась бы как «синхронно»
// (.claude/docs/verification-pitfalls.md).
//
// Использование:
//   node scripts/check-route-table-regex-sync.mjs
//   node scripts/check-route-table-regex-sync.mjs --root=<каталог>   # для тестов
//
// Код возврата: 1, если найдено хотя бы одно расхождение или проблема с разбором.
//
// ⚠️ В исходнике намеренно нет ни одного обратного слэша: heredoc в Bash-инструменте и Edit с
// old_string схлопывают и портят слэши (.claude/docs/zenstack-form-meta-directive-pitfalls.md § 2),
// а здесь слэши — сам предмет сравнения. Слэш берётся как String.fromCharCode(92), литерал регулярки
// читается посимвольно, а не регэкспом. Не «упрощай» это литералами.

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './lib/repo-root.mjs'

const BS = String.fromCharCode(92)

/** Сравниваемые константы. Переименовал константу в одной из копий — правь и этот список. */
export const CONSTANTS = ['ROUTE_HEADER_RE', 'LEGEND_RE', 'BLANK_RE']

/** Две копии, пути от корня репозитория. `label` — как называть сторону в выводе. */
export const SIDES = [
  { label: 'dashboard-agent', file: 'apps/dashboard-agent/src/lib/deploy-route-table.ts' },
  { label: 'deploy-mcp', file: 'libs/deploy-mcp/src/log-tools.ts' },
]

const IDENT_CHAR = /[A-Za-z0-9_$]/

/**
 * Читает литерал регулярки, начинающийся с `/` в позиции `start` строки `line`.
 * Слэш внутри класса `[...]` конец литерала не означает; слэш плюс следующий символ — одна пара.
 * Возвращает `{ literal }` вместе с флагами либо `{ error }`, если литерал не закрыт в этой строке.
 */
export function readRegexLiteral(line, start) {
  let i = start + 1
  let inClass = false
  while (i < line.length) {
    const ch = line[i]
    if (ch === BS) {
      i += 2
      continue
    }
    if (ch === '[') {
      inClass = true
    } else if (ch === ']') {
      inClass = false
    } else if (ch === '/' && !inClass) {
      let end = i + 1
      while (end < line.length && /[a-z]/.test(line[end])) { end += 1 }
      return { literal: line.slice(start, end) }
    }
    i += 1
  }
  return { error: 'литерал регулярки не закрыт в пределах одной строки' }
}

/**
 * Находит объявления `const NAME = /…/flags` (в т. ч. `export const` и с аннотацией типа) и
 * возвращает все вхождения: `[{ line, literal }]` либо `{ line, error }` для незакрытого литерала.
 * Объявление ищется в начале строки (после отступа), поэтому упоминания имени в комментариях и
 * в теле функций (`ROUTE_HEADER_RE.test(...)`) не считаются.
 */
export function findRegexConstant(text, name) {
  const found = []
  const lines = text.split(String.fromCharCode(10))
  for (let idx = 0; idx < lines.length; idx += 1) {
    let rest = lines[idx].trimStart()
    if (rest.startsWith('export ')) { rest = rest.slice('export '.length).trimStart() }
    if (!rest.startsWith('const ')) { continue }
    rest = rest.slice('const '.length).trimStart()
    if (!rest.startsWith(name) || IDENT_CHAR.test(rest[name.length] ?? '')) { continue }
    rest = rest.slice(name.length)
    const eq = rest.indexOf('=')
    if (eq < 0) { continue }
    const before = rest.slice(0, eq).trim()
    if (before !== '' && !before.startsWith(':')) { continue }
    const value = rest.slice(eq + 1).trimStart()
    if (!value.startsWith('/')) { continue }
    const parsed = readRegexLiteral(value, 0)
    found.push({ line: idx + 1, ...parsed })
  }
  return found
}

/** Разбивает литерал `/тело/флаги` на части — для проверки, что он компилируется. */
export function splitLiteral(literal) {
  const last = literal.lastIndexOf('/')
  return { source: literal.slice(1, last), flags: literal.slice(last + 1) }
}

/**
 * Достаёт литерал одной константы из текста одной стороны.
 * Возвращает `{ literal, line }` либо `{ problem }` — текст того, что не даёт сравнить.
 */
export function resolveConstant(text, name) {
  const found = findRegexConstant(text, name)
  if (found.length === 0) {
    return { problem: `константа ${name} не найдена (переименована? поправь CONSTANTS в этом скрипте)` }
  }
  if (found.length > 1) {
    const lines = found.map((f) => f.line).join(', ')
    return { problem: `константа ${name} объявлена ${found.length} раза (строки ${lines}) — какая из них настоящая?` }
  }
  const [only] = found
  if (only.error) {
    return { problem: `${name}: ${only.error} (строка ${only.line})` }
  }
  try {
    const { source, flags } = splitLiteral(only.literal)
    new RegExp(source, flags)
  } catch (error) {
    return { problem: `${name}: литерал не компилируется как RegExp (строка ${only.line}): ${error.message}` }
  }
  return { literal: only.literal, line: only.line }
}

/**
 * Сравнивает константы двух сторон. `left`/`right` — `{ label, text }`.
 * Возвращает `{ rows, problems }`: `rows` — по строке на константу (для вывода), `problems` — что
 * не так. Пустой `problems` — копии синхронны.
 */
export function compareSides(left, right, names = CONSTANTS) {
  const rows = []
  const problems = []
  for (const name of names) {
    const a = resolveConstant(left.text, name)
    const b = resolveConstant(right.text, name)
    const row = { name, left: a, right: b, same: false }
    if (a.problem) { problems.push(`${left.label}: ${a.problem}`) }
    if (b.problem) { problems.push(`${right.label}: ${b.problem}`) }
    if (!a.problem && !b.problem) {
      row.same = a.literal === b.literal
      if (!row.same) {
        problems.push(
          `${name} разошлась: ${left.label} (строка ${a.line}) ${a.literal} ≠ ${right.label} (строка ${b.line}) ${b.literal}`,
        )
      }
    }
    rows.push(row)
  }
  return { rows, problems }
}

function main() {
  const rootArg = process.argv.find((a) => a.startsWith('--root='))?.slice('--root='.length)
  const root = rootArg ? path.resolve(rootArg) : repoRoot()

  const sides = []
  const problems = []
  for (const side of SIDES) {
    const abs = path.join(root, side.file)
    if (!existsSync(abs)) {
      problems.push(`${side.label}: файла нет — ${side.file}`)
      continue
    }
    sides.push({ label: side.label, file: side.file, text: readFileSync(abs, 'utf8') })
  }

  if (sides.length === SIDES.length) {
    const result = compareSides(sides[0], sides[1])
    problems.push(...result.problems)
    for (const row of result.rows) {
      const mark = row.same ? '✅' : '❌'
      const shown = row.left.literal ?? row.right.literal ?? '(не разобрана)'
      console.log(`${mark} ${row.name.padEnd(16)} ${row.same ? shown : 'расхождение или ошибка разбора'}`)
    }
  }

  if (problems.length > 0) {
    console.error('')
    console.error(`❌ ${problems.length} проблем(а/ы) с синхронностью регулярок таблицы маршрутов Next.js:`)
    for (const p of problems) { console.error(`   - ${p}`) }
    console.error('')
    console.error('   Копии дублированы намеренно (dashboard-agent собран изолированно от монорепо) — правь обе')
    console.error(`   в одном коммите: ${SIDES.map((s) => s.file).join(' и ')}`)
    console.error('   Разбор: PLAN-INFRA-6.md §157, .claude/docs/mcp-servers.md (раздел Deploy)')
    process.exit(1)
  }
  console.log(`✅ регулярки таблицы маршрутов синхронны в ${SIDES.length} копиях (${CONSTANTS.length} констант)`)
}

// Запуск только как скрипт: тесты импортируют функции разбора без побочных эффектов.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
