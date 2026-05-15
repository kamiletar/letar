/**
 * Препроцессинг symbl-data → data/symbols.json
 *
 * Источник: c:/web/symbl-data/loc/ru/symbols/*.txt
 * Формат строки: XXXX: Название[: синоним1, синоним2]
 *
 * Стратегия отбора:
 * 1. Курированные блоки (полезные символы)
 * 2. Плюс ВСЕ символы с синонимами из любых блоков
 *
 * Запуск: bun apps/kami-key-the/scripts/build-symbl-data.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SYMBL_DIR = 'c:/web/symbl-data/loc/ru/symbols'
const OUTPUT_DIR = join(import.meta.dirname ?? '.', '..', 'data')
const OUTPUT_FILE = join(OUTPUT_DIR, 'symbols.json')

/** Курированные диапазоны Unicode (включительно) */
const CURATED_RANGES: [number, number][] = [
  [0x00a0, 0x00ff], // Latin-1 Supplement (без контрольных символов 0080-009F)
  [0x2000, 0x206f], // General Punctuation
  [0x20a0, 0x20cf], // Currency Symbols
  [0x2100, 0x214f], // Letterlike Symbols
  [0x2150, 0x218f], // Number Forms
  [0x2190, 0x21ff], // Arrows
  [0x2200, 0x22ff], // Mathematical Operators
  [0x2300, 0x23ff], // Miscellaneous Technical
  [0x2500, 0x257f], // Box Drawing
  [0x25a0, 0x25ff], // Geometric Shapes
  [0x2600, 0x26ff], // Miscellaneous Symbols
  [0x2700, 0x27bf], // Dingbats
]

interface SymbolEntry {
  /** Unicode codepoint (hex, 4 символа) */
  c: string
  /** Русское название */
  n: string
  /** Синонимы (через запятую) */
  s?: string
}

/** Проверить, попадает ли codepoint в курированные диапазоны */
function isInCuratedRange(cp: number): boolean {
  return CURATED_RANGES.some(([start, end]) => cp >= start && cp <= end)
}

/** Парсинг строки: "XXXX: Название: синоним1, синоним2" */
function parseLine(line: string): SymbolEntry | null {
  // Убрать BOM если есть
  const clean = line.replace(/^\uFEFF/, '').trim()
  if (!clean) return null

  // Формат: XXXX: Название[: синонимы]
  const colonIndex = clean.indexOf(':')
  if (colonIndex === -1) return null

  const codepoint = clean.slice(0, colonIndex).trim()

  // Валидация codepoint (4-5 hex символов)
  if (!/^[\dA-Fa-f]{4,5}$/.test(codepoint)) return null

  const rest = clean.slice(colonIndex + 1).trim()
  if (!rest) return null

  // Разделить название и синонимы по второму ":"
  const secondColon = rest.indexOf(':')
  let name: string
  let synonyms: string | undefined

  if (secondColon !== -1) {
    name = rest.slice(0, secondColon).trim()
    const synStr = rest.slice(secondColon + 1).trim()
    if (synStr) {
      synonyms = synStr
    }
  } else {
    name = rest
  }

  if (!name) return null

  const entry: SymbolEntry = { c: codepoint.toUpperCase(), n: name }
  if (synonyms) {
    entry.s = synonyms
  }
  return entry
}

// --- Main ---

console.log('Препроцессинг symbl-data...')
console.log(`Источник: ${SYMBL_DIR}`)

if (!existsSync(SYMBL_DIR)) {
  console.error(`Директория не найдена: ${SYMBL_DIR}`)
  process.exit(1)
}

const files = readdirSync(SYMBL_DIR)
  .filter((f) => f.endsWith('.txt'))
  .sort()
console.log(`Файлов: ${files.length}`)

// Собираем символы: курированные + все с синонимами
const symbols = new Map<string, SymbolEntry>()
let totalLines = 0
let withSynonyms = 0

for (const file of files) {
  const content = readFileSync(join(SYMBL_DIR, file), 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const entry = parseLine(line)
    if (!entry) continue
    totalLines++

    const cp = parseInt(entry.c, 16)
    const inCurated = isInCuratedRange(cp)
    const hasSynonyms = !!entry.s

    if (hasSynonyms) withSynonyms++

    // Пропустить контрольные символы (0000-001F, 007F, 0080-009F)
    if (cp <= 0x1f || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f)) continue

    if (inCurated || hasSynonyms) {
      symbols.set(entry.c, entry)
    }
  }
}

// Сортируем по codepoint
const sorted = [...symbols.values()].sort((a, b) => {
  return parseInt(a.c, 16) - parseInt(b.c, 16)
})

// Записываем
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

const json = JSON.stringify(sorted)
writeFileSync(OUTPUT_FILE, json, 'utf-8')

const sizeKb = Math.round(json.length / 1024)

console.log()
console.log(`Всего строк с описаниями: ${totalLines}`)
console.log(`С синонимами: ${withSynonyms}`)
console.log(`Курированные диапазоны: ${CURATED_RANGES.length}`)
console.log(`Итого символов: ${sorted.length}`)
console.log(`Размер: ${sizeKb} KB`)
console.log(`Записано: ${OUTPUT_FILE}`)
