#!/usr/bin/env node
/**
 * Codemod: comment-директивы `@form.*` → нативные field-атрибуты `@meta("form.*", …)`
 * (Фаза 3 миграции `zenstack-form-plugin`, v3.0.0 — libs/forms/PLAN.md).
 *
 * Использование:
 *   node scripts/codemods/codemod-form-directives.mjs --dry-run "apps/<app>/schema.zmodel" [...]
 *   node scripts/codemods/codemod-form-directives.mjs "apps/<app>/schema.zmodel" [...]
 *
 * Работает построчно на тексте `.zmodel`-файла, не через Langium-парсер (грамматика ZModel
 * не выставляет публичный AST для утилитных скриптов вне самого ZenStack). Поэтому — намеренно
 * консервативен: конвертирует только однозначно узнаваемые директивы, всё остальное оставляет
 * как есть и печатает в блок «ТРЕБУЕТ РУЧНОЙ ПРОВЕРКИ», а не угадывает.
 *
 * Идемпотентен: если у поля уже есть `@meta("form.<key>", …)` для конкретного ключа, повторный
 * прогон эту директиву не задваивает (comment-строка остаётся нетронутой — конвертируется только
 * то, чего ещё нет в виде @meta).
 *
 * ⚠️ НЕ конвертирует `@form.props({...})`/`@form.relation({...})` в объектный литерал `@meta` —
 * `@meta(key, {...})` роняет `zenstack generate` целиком (`Unsupported attribute arg value:
 * ObjectExpr`, upstream-ограничение, проверено живым прогоном в Фазе 3). Вместо этого объект
 * разворачивается в плоские точечные ключи: `@form.props({ min: 1, max: 100 })` →
 * `@meta("form.props.min", 1) @meta("form.props.max", 100)`.
 */

import { readFileSync, writeFileSync, existsSync, globSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const patterns = args.filter((a) => a !== '--dry-run')

if (patterns.length === 0) {
  console.error('Использование: node codemod-form-directives.mjs [--dry-run] <файл-или-glob.zmodel> [...]')
  process.exit(1)
}

const files = [...new Set(patterns.flatMap((p) => (existsSync(p) ? [p] : globSync(p, { cwd: process.cwd() }))))]
  .map((p) => path.resolve(process.cwd(), p))

if (files.length === 0) {
  console.error('Не найдено файлов по переданным путям/glob-паттернам')
  process.exit(1)
}

/** Простые директивы со строковым аргументом: @form.title("...") → form.title */
const STRING_DIRECTIVES = {
  title: 'title',
  placeholder: 'placeholder',
  description: 'description',
  fieldType: 'fieldType',
}

/** Конвертировать JS-подобный объектный литерал (как в @form.props/@form.relation) в plain-объект. */
function parseJsObjectLiteral(src) {
  const jsonStr = src
    .replace(/'/g, '"')
    .replace(/(\w+)\s*:/g, '"$1":')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*\]/g, ']')
  return JSON.parse(jsonStr)
}

/** Развернуть объект в плоские точечные пары [путь, значение] — рекурсивно для вложенных объектов. */
function flattenToPairs(obj, prefix = '') {
  const pairs = []
  for (const [key, value] of Object.entries(obj)) {
    const dotKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      pairs.push(...flattenToPairs(value, dotKey))
    } else {
      pairs.push([dotKey, value])
    }
  }
  return pairs
}

function metaCall(key, value) {
  return `@meta(${JSON.stringify(`form.${key}`)}, ${JSON.stringify(value)})`
}

/**
 * Разобрать одну `///`-строку комментария на распознанную директиву.
 * Возвращает `{ metaCalls: string[] }` при успехе, `null` если строка не директива вообще
 * (обычный текстовый комментарий — не трогаем), или `{ manualReview: причина }` если это похоже
 * на директиву, но конвертировать автоматически не получается.
 */
function parseDirectiveLine(line) {
  const trimmed = line.trim().replace(/^\/\/\/\s?/, '')

  for (const [directive, key] of Object.entries(STRING_DIRECTIVES)) {
    const m = trimmed.match(new RegExp(`^@form\\.${directive}\\("([^"]*)"\\)$`))
    if (m) {
      return { metaCalls: [metaCall(key, m[1])] }
    }
  }

  if (/^@form\.exclude$/.test(trimmed)) {
    return { metaCalls: [metaCall('exclude', true)] }
  }

  const propsMatch = trimmed.match(/^@form\.props\((\{[\s\S]*\})\)$/)
  if (propsMatch) {
    try {
      const obj = parseJsObjectLiteral(propsMatch[1])
      return { metaCalls: flattenToPairs(obj).map(([k, v]) => metaCall(`props.${k}`, v)) }
    } catch {
      return { manualReview: `@form.props(...) — объект не распознан парсером кодмода: ${trimmed}` }
    }
  }

  const relationMatch = trimmed.match(/^@form\.relation\((\{[\s\S]*\})\)$/)
  if (relationMatch) {
    try {
      const obj = parseJsObjectLiteral(relationMatch[1])
      return { metaCalls: flattenToPairs(obj).map(([k, v]) => metaCall(`relation.${k}`, v)) }
    } catch {
      return { manualReview: `@form.relation(...) — объект не распознан парсером кодмода: ${trimmed}` }
    }
  }

  if (/^@form\.relation\(/.test(trimmed)) {
    // Позиционная форма (`@form.relation("Model", "field")`) — парсер плагина её не поддерживает
    // (только объектный литерал), это уже сейчас мёртвая директива. Не угадываем семантику.
    return { manualReview: `@form.relation(...) не в форме объектного литерала — уже не работает: ${trimmed}` }
  }

  if (/^@form\./.test(trimmed)) {
    return { manualReview: `неизвестная/нестандартная директива @form.*: ${trimmed}` }
  }

  return null
}

let totalConverted = 0
let totalManualReview = 0
const manualReviewItems = []

for (const filePath of files) {
  const relPath = path.relative(process.cwd(), filePath)
  const original = readFileSync(filePath, 'utf-8')
  const lines = original.split('\n')
  const output = []
  let pendingMetaCalls = []
  let fileConverted = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isCommentLine = /^\s*\/\/\/.*$/.test(line)

    if (isCommentLine) {
      const parsed = parseDirectiveLine(line)
      if (parsed === null) {
        output.push(line)
      } else if (parsed.manualReview) {
        manualReviewItems.push(`${relPath}:${i + 1} — ${parsed.manualReview}`)
        output.push(line)
      } else {
        pendingMetaCalls.push(...parsed.metaCalls)
        // Строка-директива полностью конвертирована — не переносим в вывод.
      }
      continue
    }

    if (pendingMetaCalls.length > 0 && line.trim().length > 0) {
      // Идемпотентность: не дублировать @meta-ключ, если он уже есть на этой строке.
      const toAppend = pendingMetaCalls.filter((call) => {
        const keyMatch = call.match(/@meta\("([^"]+)"/)
        return !keyMatch || !line.includes(`@meta("${keyMatch[1]}"`)
      })
      if (toAppend.length > 0) {
        output.push(`${line.replace(/\s+$/, '')} ${toAppend.join(' ')}`)
        fileConverted += toAppend.length
      } else {
        output.push(line)
      }
      pendingMetaCalls = []
      continue
    }

    // Пустая строка между комментарием-директивой и полем (например, разрыв между блоками полей)
    // — не то, что ожидалось, откатываем как manual review, чтобы не потерять директиву молча.
    if (pendingMetaCalls.length > 0 && line.trim().length === 0) {
      manualReviewItems.push(
        `${relPath}:${i + 1} — директива(ы) перед пустой строкой без поля-получателя: ${pendingMetaCalls.join(' ')}`,
      )
      pendingMetaCalls = []
    }

    output.push(line)
  }

  if (pendingMetaCalls.length > 0) {
    manualReviewItems.push(`${relPath}:EOF — директива(ы) в конце файла без поля-получателя: ${pendingMetaCalls.join(' ')}`)
  }

  if (fileConverted > 0) {
    totalConverted += fileConverted
    const newContent = output.join('\n')
    if (dryRun) {
      console.log(`[dry-run] ${relPath}: ${fileConverted} директив(ы) будут конвертированы`)
    } else {
      writeFileSync(filePath, newContent, 'utf-8')
      console.log(`${relPath}: ${fileConverted} директив(ы) конвертированы`)
    }
  }
}

totalManualReview = manualReviewItems.length

console.log(`\nИтого: ${totalConverted} директив(ы) ${dryRun ? 'будут конвертированы' : 'конвертированы'}.`)
if (totalManualReview > 0) {
  console.log(`\nТРЕБУЕТ РУЧНОЙ ПРОВЕРКИ (${totalManualReview}):`)
  for (const item of manualReviewItems) {
    console.log(`  ${item}`)
  }
}

if (dryRun) {
  console.log('\n--dry-run: файлы не изменены. Повтори без флага, чтобы применить.')
} else {
  console.log('\nДальше: nx zenstack:generate <app> → просмотреть дифф сгенерированных form-schemas → e2e.')
}
