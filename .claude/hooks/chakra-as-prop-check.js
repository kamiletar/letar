#!/usr/bin/env node
/**
 * PostToolUse хук: ловит НОВЫЙ проп `as=` на JSX-компоненте после Write/Edit.
 *
 * Зачем: запрет `as=` (только `asChild` + нативный элемент) живёт в path-scoped
 * `.claude/rules/components.md` и в semgrep-правиле уровня WARNING, которое срабатывает лишь
 * при коммите. Правило не доезжает до агента в момент записи, а ~750 старых `as=` в коде
 * учат обратному. Хук возвращает замечание сразу, в том же ходе.
 *
 * Ругается только на вхождения, которых не было до правки:
 * - Edit — сравнивает `old_string` и `new_string`;
 * - Write — сравнивает с версией файла в HEAD (новый/неотслеживаемый файл — всё новое).
 * Старые вхождения (~1400 по репо) не шумят.
 *
 * Правку не откатывает и работу не блокирует: `decision: "block"` у PostToolUse лишь
 * передаёт `reason` агенту как обратную связь.
 */

const { execFileSync } = require('child_process')
const path = require('path')

const SUPPORTED_EXTENSIONS = ['.tsx', '.jsx']
const EXCLUDED_PATHS = ['/node_modules/', '/.next/', '/dist/', '/.git/', '/coverage/', '/.nx/']

// Открывающий тег компонента с большой буквы, у которого среди атрибутов есть `as=`.
// Выражения в `{...}` пропускаются целиком (до двух уровней вложенности), чтобы `=>` и `>`
// внутри обработчиков не обрывали тег.
const AS_PROP_RE = /<([A-Z][\w.]*)((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)\sas=(\{[^}]*\}|"[^"]*"|'[^']*')/g

/** Нормализованные вхождения: `Box as="section"` — пробелы и переводы строк схлопнуты. */
function findAsProps(text) {
  const found = []
  if (!text) {
    return found
  }
  for (const match of text.matchAll(AS_PROP_RE)) {
    found.push(`${match[1]} as=${match[3].replace(/\s+/g, ' ')}`)
  }
  return found
}

/** Вхождения из `after`, которых нет в `before` (с учётом кратности). */
function newOccurrences(before, after) {
  const counts = new Map()
  for (const item of findAsProps(before)) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  const added = []
  for (const item of findAsProps(after)) {
    const left = counts.get(item) || 0
    if (left > 0) {
      counts.set(item, left - 1)
    } else {
      added.push(item)
    }
  }
  return added
}

/** Содержимое файла в HEAD его собственного репозитория (submodule — свой git). */
function readHeadVersion(filePath) {
  try {
    const dir = path.dirname(filePath)
    return execFileSync('git', ['-C', dir, 'show', `HEAD:./${path.basename(filePath)}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    })
  } catch {
    // Файла нет в HEAD (новый) или git недоступен — считаем, что до правки было пусто
    return ''
  }
}

function collectAdded(toolName, input) {
  if (toolName === 'Edit') {
    return newOccurrences(input.old_string, input.new_string)
  }
  if (toolName === 'MultiEdit' && Array.isArray(input.edits)) {
    return input.edits.flatMap((e) => newOccurrences(e.old_string, e.new_string))
  }
  if (toolName === 'Write') {
    return newOccurrences(readHeadVersion(input.file_path), input.content)
  }
  return []
}

function buildReason(filePath, added) {
  const unique = [...new Set(added)]
  const list = unique.slice(0, 8).map((s) => `  - <${s}`).join('\n')
  const more = unique.length > 8 ? `\n  - …и ещё ${unique.length - 8}` : ''
  return [
    `В ${path.basename(filePath)} добавлен проп as= на компоненте:`,
    list + more,
    '',
    'В репозитории as= запрещён: только asChild + нативный элемент внутри.',
    '  <Heading as="h1" size="xl">…</Heading>  →  <Heading asChild size="xl"><h1>…</h1></Heading>',
    '  <Box as="button" onClick={f} w={8}/>    →  <Box asChild w={8}><button type="button" onClick={f} /></Box>',
    '  <Link as={NextLink} href="/x">…</Link>  →  <Link asChild><NextLink href="/x">…</NextLink></Link>',
    '  <Icon as={LuX} boxSize={4} />          →  <LuX size={16} />',
    'Стили остаются на Chakra-компоненте, HTML-атрибуты и обработчики — на нативном теге.',
    'У asChild ровно один ребёнок, иначе остальные молча пропадут.',
    'Перепиши эти места сейчас. Рецепт: .claude/docs/chakra-icon-as-prop-cleanup-pattern.md',
  ].join('\n')
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw)
    const input = data.tool_input || {}
    const filePath = input.file_path || ''
    if (!filePath || !SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase())) {
      process.exit(0)
    }
    const normalized = filePath.replace(/\\/g, '/')
    if (EXCLUDED_PATHS.some((p) => normalized.includes(p))) {
      process.exit(0)
    }

    const added = collectAdded(data.tool_name, input)
    if (added.length === 0) {
      process.exit(0)
    }
    process.stdout.write(JSON.stringify({ decision: 'block', reason: buildReason(filePath, added) }))
    process.exit(0)
  } catch {
    // Хук — подсказка, а не барьер: любая ошибка разбора не должна мешать работе
    process.exit(0)
  }
})

module.exports = { findAsProps, newOccurrences }
