#!/usr/bin/env node
// Сторож на тихую ловушку: обратный слэш в строковом литерале .zmodel съедается парсером.
//
// Механизм (.claude/docs/zenstack-form-meta-directive-pitfalls.md § 2): Langium разбирает
// строку ZModel с escape-последовательностями. Пара из двух слэшей даёт один слэш, а
// одиночный слэш перед «неизвестным» символом теряется: в плагин доходит буква «s» вместо
// пробельного класса. Паттерн остаётся синтаксически валидным, `zenstack generate` и
// typecheck зелёные, а регулярка уже другая — ошибка видна только на живом вводе.
//
// Что проверяется: значения паттернов в двух местах —
//   - нативный атрибут `@regex("…")` (в т. ч. с именованным аргументом);
//   - `@meta("form.props.pattern", "…")` (escape hatch плагина форм).
//
// Разбор строкового литерала — по правилам Langium, а не регэкспом по строке: слэш плюс
// любой следующий символ — одна пара. Поэтому закавыченные атрибуты внутри комментариев
// (`//`, `///`, блочных) игнорируются, а кавычка внутри литерала не рвёт разбор.
//
// Как оцениваются серии слэшей в записи паттерна (n — длина серии подряд):
//   n = 1 перед классом s, d, w, b, S, D, W, B или «.» — ОШИБКА: слэш съеден (у b — станет
//         управляющим символом backspace), регулярка молча другая;
//   n = 1 перед любым другим символом, кроме n, r, t, f, v, 0, «/» и кавычек — тоже ОШИБКА, механизм
//         тот же (например, скобка перестаёт быть экранированной и открывает группу);
//   n = 2 — норма: в рантайме один слэш, то есть верное экранирование регулярки;
//   n = 3 — предупреждение: работает случайно (слэш + съеденный escape), запись хрупкая;
//   n >= 4 — предупреждение: в рантайме два и больше слэшей подряд — «обратная крайность»,
//         регулярка ищет литеральный слэш и букву. Бывает намеренно (искать сам слэш),
//         поэтому не ошибка.
//
// Что НЕ считается проблемой: n, r, t (Langium превращает в настоящие перевод строки и
// табуляцию — это то же, что увидела бы регулярка), f, v, 0 — аналогично, «/» — в
// RegExp-конструкторе он и без экранирования обычный символ, и обе кавычки — их иначе не
// вписать в литерал.
//
// Покрытие: обходит apps/ и libs/ (без node_modules, .next, dist и .claude/worktrees).
// Выкачены ли приватные submodule, скрипт сообщает сам: невыкаченные не проверены, и
// молчаливо зелёный прогон читался бы как «проверено» (verification-pitfalls.md).
//
// Использование:
//   node scripts/check-zmodel-regex-backslashes.mjs
//   node scripts/check-zmodel-regex-backslashes.mjs --root=<каталог>   # для тестов
//
// Код возврата: 1, если найдена хотя бы одна ОШИБКА; предупреждения на него не влияют.
//
// ⚠️ В исходнике намеренно нет ни одного обратного слэша: heredoc в Bash-инструменте и
// Edit с old_string схлопывают и портят слэши (там же, § 2). Слэш берётся как
// String.fromCharCode(92), перевод строки — как код 10. Не «упрощай» это литералами.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SKIP_DIRS, walk } from './lib/fs-walk.mjs'
import { repoRoot } from './lib/repo-root.mjs'
import { isCheckedOut, readSubmodulePaths } from './lib/submodules.mjs'

const BS = String.fromCharCode(92)
const NL = String.fromCharCode(10)
const PAIR = BS + BS

const PATTERN_META_KEY = 'form.props.pattern'

// Классы, перед которыми одиночный слэш — заведомо ошибка (перечень из задачи аудита).
const CLASS_CHARS = new Set(['s', 'd', 'w', 'b', 'S', 'D', 'W', 'B', '.'])
// Escape-и, которые Langium превращает в управляющий символ; для регулярки это то же самое.
const CONTROL_ESCAPES = new Map([['b', 8], ['f', 12], ['n', 10], ['r', 13], ['t', 9], ['v', 11], ['0', 0]])
// Одиночный слэш перед этими символами безвреден: результат для RegExp тот же. Кавычки —
// единственный способ вписать саму кавычку в литерал, потерянный слэш там ничего не ломает.
const HARMLESS_SINGLE = new Set(['n', 'r', 't', 'f', 'v', '0', '/', '"', "'"])

const WORD_CHAR = /[A-Za-z0-9_]/
const ATTR_NAME_CHAR = /[A-Za-z0-9_.]/

// Что получит плагин после разбора литерала Langium. Только для вывода: показывает,
// во что превратился паттерн на самом деле.
export function decodeLangiumString(raw) {
  let out = ''
  let i = 0
  while (i < raw.length) {
    const ch = raw[i]
    if (ch === BS && i + 1 < raw.length) {
      const next = raw[i + 1]
      out += CONTROL_ESCAPES.has(next) ? String.fromCharCode(CONTROL_ESCAPES.get(next)) : next
      i += 2
    } else {
      out += ch
      i += 1
    }
  }
  return out
}

// Управляющие символы в выводе показываем как <U+0008>, иначе backspace в консоли невидим.
function showVisible(text) {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)
    out += code < 32 ? `<U+${code.toString(16).toUpperCase().padStart(4, '0')}>` : ch
  }
  return out
}

// Лексер ZModel ровно настолько, насколько нужно: строки (с парой слэш+символ), комментарии,
// имена атрибутов и пунктуация. Значение string-токена — «сырой» текст между кавычками,
// escape-последовательности НЕ раскрыты (именно по нему считаем серии слэшей).
export function tokenize(text) {
  const tokens = []
  const length = text.length
  let i = 0
  while (i < length) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch.trim() === '') {
      i += 1
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < length && text[i] !== NL) { i += 1 }
      continue
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? length : end + 2
      continue
    }
    if (ch === '"' || ch === "'") {
      const start = i
      i += 1
      let body = ''
      while (i < length && text[i] !== ch) {
        if (text[i] === BS && i + 1 < length) {
          body += text[i] + text[i + 1]
          i += 2
        } else {
          body += text[i]
          i += 1
        }
      }
      i += 1 // закрывающая кавычка (при незакрытой строке i просто выходит за конец)
      tokens.push({ kind: 'string', text: body, start })
      continue
    }
    if (ch === '@') {
      let j = i + 1
      if (text[j] === '@') { j += 1 }
      const nameStart = j
      while (j < length && ATTR_NAME_CHAR.test(text[j])) { j += 1 }
      tokens.push({ kind: 'attr', text: text.slice(nameStart, j), start: i })
      i = j
      continue
    }
    if (WORD_CHAR.test(ch)) {
      let j = i + 1
      while (j < length && WORD_CHAR.test(text[j])) { j += 1 }
      tokens.push({ kind: 'ident', text: text.slice(i, j), start: i })
      i = j
      continue
    }
    tokens.push({ kind: 'punct', text: ch, start: i })
    i += 1
  }
  return tokens
}

const isPunct = (token, char) => token?.kind === 'punct' && token.text === char

// Паттерны, которые попадают в RegExp: значение `@regex` и второй аргумент
// `@meta("form.props.pattern", …)`.
export function findPatterns(tokens) {
  const found = []
  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k]
    if (token.kind !== 'attr' || !isPunct(tokens[k + 1], '(')) { continue }

    if (token.text === 'regex') {
      let p = k + 2
      // именованный аргумент: @regex(regex: "…")
      if (tokens[p]?.kind === 'ident' && isPunct(tokens[p + 1], ':')) { p += 2 }
      if (tokens[p]?.kind === 'string') {
        found.push({ attr: '@regex', token: tokens[p] })
      }
    } else if (token.text === 'meta') {
      const key = tokens[k + 2]
      const value = tokens[k + 4]
      if (
        key?.kind === 'string' && key.text === PATTERN_META_KEY
        && isPunct(tokens[k + 3], ',') && value?.kind === 'string'
      ) {
        found.push({ attr: `@meta("${PATTERN_META_KEY}")`, token: value })
      }
    }
  }
  return found
}

// Серии слэшей в сыром паттерне → список находок { severity, message }.
export function analyzePattern(raw) {
  const findings = []
  let i = 0
  while (i < raw.length) {
    if (raw[i] !== BS) {
      i += 1
      continue
    }
    let j = i
    while (raw[j] === BS) { j += 1 }
    const run = j - i
    const following = raw[j]
    const written = BS.repeat(run) + (following ?? '')

    if (run === 1 && following !== undefined) {
      if (CLASS_CHARS.has(following)) {
        findings.push({
          severity: 'error',
          message: following === 'b'
            ? `«${written}»: одиночный слэш — Langium превратит его в управляющий символ backspace `
              + `(U+0008), а не в границу слова; верно «${PAIR}b»`
            : `«${written}»: одиночный слэш перед «${following}» — Langium съест слэш, `
              + `в плагин уйдёт «${following}»; верно «${PAIR}${following}»`,
        })
      } else if (!HARMLESS_SINGLE.has(following)) {
        findings.push({
          severity: 'error',
          message: `«${written}»: одиночный слэш перед «${following}» — Langium съест слэш, `
            + `в плагин уйдёт «${following}» без экранирования; верно «${PAIR}${following}»`,
        })
      }
    } else if (run === 3) {
      findings.push({
        severity: 'warn',
        message: `«${written}»: три слэша подряд — работает случайно (слэш плюс съеденный escape), `
          + `запись хрупкая; штатная — «${PAIR}${following ?? ''}»`,
      })
    } else if (run >= 4) {
      findings.push({
        severity: 'warn',
        message: `«${written}»: ${run} слэшей подряд — в рантайме будет ${Math.floor(run / 2)} `
          + `(регулярка ищет литеральный слэш); если экранировался класс — штатная запись «${PAIR}${following ?? ''}»`,
      })
    }
    i = j
  }
  return findings
}

function lineAt(text, position) {
  let line = 1
  for (let i = 0; i < position; i += 1) {
    if (text.charCodeAt(i) === 10) { line += 1 }
  }
  return line
}

// Полный разбор одного файла: каждый паттерн со слэшем попадает в результат (даже верный —
// для счётчика в отчёте), находки лежат в `findings`.
export function scanZmodelText(text) {
  return findPatterns(tokenize(text)).map(({ attr, token }) => ({
    attr,
    line: lineAt(text, token.start),
    raw: token.text,
    hasBackslash: token.text.includes(BS),
    findings: analyzePattern(token.text),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────

function rel(root, absPath) {
  return path.relative(root, absPath).split(path.sep).join('/')
}

function collectZmodelFiles(root) {
  const skipDirs = new Set([...DEFAULT_SKIP_DIRS, '.turbo', 'coverage'])
  const worktreeMarker = `/.claude/worktrees/`
  const files = []
  for (const top of ['apps', 'libs']) {
    files.push(...walk(path.join(root, top), (name) => name.endsWith('.zmodel'), 8, skipDirs))
  }
  return files.filter((file) => !file.split(path.sep).join('/').includes(worktreeMarker)).sort()
}

// Приватные submodule внутри apps/ и libs/, которые не выкачаны: их .zmodel не проверены.
function missingSubmodules(root) {
  let paths
  try {
    paths = readSubmodulePaths(root)
  } catch {
    return [] // нет .gitmodules (например, синтетический корень теста) — сравнивать не с чем
  }
  return paths
    .filter((p) => p.startsWith('apps/') || p.startsWith('libs/'))
    .filter((p) => !isCheckedOut(path.join(root, p)))
}

function main() {
  const rootArg = process.argv.slice(2).find((a) => a.startsWith('--root='))?.slice('--root='.length)
  const root = rootArg ? path.resolve(rootArg) : repoRoot()

  const files = collectZmodelFiles(root)
  const errors = []
  const warnings = []
  let patternCount = 0
  let slashPatternCount = 0

  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of scanZmodelText(text)) {
      patternCount += 1
      if (pattern.hasBackslash) { slashPatternCount += 1 }
      for (const finding of pattern.findings) {
        const entry = { file: rel(root, file), pattern, finding }
        ;(finding.severity === 'error' ? errors : warnings).push(entry)
      }
    }
  }

  const printEntry = ({ file, pattern, finding }) => {
    const label = finding.severity === 'error' ? '❌' : '⚠️ '
    console.log(`${label} ${file}:${pattern.line}  ${pattern.attr}`)
    console.log(`     ${finding.message}`)
    console.log(`     на диске:      ${pattern.raw}`)
    console.log(`     плагин получит: ${showVisible(decodeLangiumString(pattern.raw))}`)
  }

  for (const entry of warnings) { printEntry(entry) }
  for (const entry of errors) { printEntry(entry) }

  const missing = missingSubmodules(root)
  if (missing.length > 0) {
    console.log(
      `⚠️  неполное покрытие: не выкачано ${missing.length} submodule — их .zmodel не проверены: `
        + missing.join(', '),
    )
  }

  console.log(
    `просканировано .zmodel: ${files.length}; паттернов @regex/${PATTERN_META_KEY}: ${patternCount}, `
      + `из них со слэшами: ${slashPatternCount}; ошибок: ${errors.length}, предупреждений: ${warnings.length}`,
  )

  if (errors.length > 0) {
    console.error('')
    console.error(
      `❌ ${errors.length} паттерн(а/ов) с потерянным слэшем: каждый слэш регулярки в .zmodel `
        + `пишется парой «${PAIR}» (ровно два символа на диске).`,
    )
    console.error('   Разбор: .claude/docs/zenstack-form-meta-directive-pitfalls.md § 2')
    process.exit(1)
  }
  console.log('✅ потерянных слэшей в @regex/form.props.pattern нет')
}

// Запуск только как скрипт: тесты импортируют функции разбора без побочных эффектов.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
