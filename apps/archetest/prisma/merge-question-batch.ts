/**
 * Влить батчи новых вопросов (prisma/question-batches/<dir>/) в банк:
 * - questions-dump.json: append с id/sortOrder/createdAt
 * - max-scores-per-question.json: per_question_max + global_max_scores + metadata
 *
 * Запуск: npx tsx apps/archetest/prisma/merge-question-batch.ts [--dry-run]
 * Идемпотентность: скрипт откажется работать, если сценарий батча уже есть в дампе.
 */
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname)
const BATCH_DIR = join(ROOT, 'question-batches', '5.1')
const DUMP = join(ROOT, 'questions-dump.json')
const MAXJSON = join(ROOT, '..', 'src', 'app', '[locale]', '_data', 'max-scores-per-question.json')

/** Порядок фиксирован — от него зависят sortOrder новых вопросов */
const BATCH_ORDER = ['MAC', 'HUM', 'KAN', 'FAI', 'SAD', 'MAS', 'ASD', 'DIR', 'ALX']
const ALL_CODES = [
  'PAR',
  'SZD',
  'SZT',
  'ANT',
  'BOR',
  'HIS',
  'NAR',
  'AVD',
  'DEP',
  'OBC',
  'BAR',
  'PAG',
  'DPR',
  'MAC',
  'HUM',
  'KAN',
  'FAI',
  'SAD',
  'MAS',
  'ASD',
  'DIR',
  'ALX',
]

interface BatchOption {
  text: string
  textEn: string
  scoring: Record<string, number>
}
interface BatchQuestion {
  scenario: string
  scenarioEn: string
  options: BatchOption[]
  _reverse?: boolean
}
interface DumpQuestion {
  id: string
  scenario: string
  scenarioEn: string
  options: string
  active: boolean
  sortOrder: number
  createdAt: string
}

const dryRun = process.argv.includes('--dry-run')

// ── Загрузка и валидация батчей ────────────────────────────────────────────
const batches = new Map<string, BatchQuestion[]>()
for (const scale of BATCH_ORDER) {
  const qs = JSON.parse(readFileSync(join(BATCH_DIR, `${scale}.json`), 'utf-8')) as BatchQuestion[]
  if (qs.length !== 15) {
    throw new Error(`${scale}: ожидалось 15 вопросов, получено ${qs.length}`)
  }
  const reverseCount = qs.filter((q) => q._reverse).length
  if (reverseCount < 5) {
    throw new Error(`${scale}: reverse-вопросов ${reverseCount} < 5 (нужно ≥ 1/3)`)
  }
  for (const [i, q] of qs.entries()) {
    if (!q.scenario || !q.scenarioEn) {
      throw new Error(`${scale} #${i}: пустой сценарий`)
    }
    if (q.options.length < 2 || q.options.length > 6) {
      throw new Error(`${scale} #${i}: ${q.options.length} опций`)
    }
    // основная шкала должна встречаться хотя бы в одной опции
    const primaryMax = Math.max(...q.options.map((o) => o.scoring[scale] ?? 0))
    if (primaryMax < 2) {
      throw new Error(`${scale} #${i}: максимум основной шкалы ${primaryMax} < 2`)
    }
    for (const o of q.options) {
      if (!o.text || !o.textEn) {
        throw new Error(`${scale} #${i}: пустой текст опции`)
      }
      for (const [code, score] of Object.entries(o.scoring)) {
        if (!ALL_CODES.includes(code)) {
          throw new Error(`${scale} #${i}: неизвестная шкала ${code}`)
        }
        if (!Number.isInteger(score) || score < 1 || score > 3) {
          throw new Error(`${scale} #${i}: балл ${code}=${score} вне 1..3`)
        }
      }
    }
  }
  batches.set(scale, qs)
}

// ── Дамп: проверка идемпотентности ─────────────────────────────────────────
const dump = JSON.parse(readFileSync(DUMP, 'utf-8')) as DumpQuestion[]
const existingScenarios = new Set(dump.map((q) => q.scenario))
const existingIds = new Set(dump.map((q) => q.id))
for (const [scale, qs] of batches) {
  for (const q of qs) {
    if (existingScenarios.has(q.scenario)) {
      throw new Error(`${scale}: сценарий уже в дампе — «${q.scenario.slice(0, 50)}…». Повторный merge?`)
    }
  }
}

// ── Сборка новых записей ───────────────────────────────────────────────────
function newId(): string {
  let id: string
  do {
    id = randomBytes(13).toString('hex').slice(0, 25)
  } while (existingIds.has(id))
  existingIds.add(id)
  return id
}

const createdAt = new Date().toISOString().replace('Z', '').slice(0, 23)
let sortOrder = dump.length
const newRecords: DumpQuestion[] = []
for (const scale of BATCH_ORDER) {
  for (const q of batches.get(scale)!) {
    newRecords.push({
      id: newId(),
      scenario: q.scenario,
      scenarioEn: q.scenarioEn,
      options: JSON.stringify(q.options.map((o) => ({ text: o.text, textEn: o.textEn, scoring: o.scoring }))),
      active: true,
      sortOrder: sortOrder++,
      createdAt,
    })
  }
}

// ── Справочник max-баллов ──────────────────────────────────────────────────
interface MaxJson {
  metadata: { total_questions: number; parsed_questions: number; scales: string[]; description: string }
  global_max_scores: Record<string, number>
  per_question_max: Record<string, Record<string, number>>
}
const maxJson = JSON.parse(readFileSync(MAXJSON, 'utf-8')) as MaxJson

for (const r of newRecords) {
  const qnum = String(r.sortOrder + 1)
  if (maxJson.per_question_max[qnum]) {
    throw new Error(`per_question_max["${qnum}"] уже существует`)
  }
  const computed: Record<string, number> = {}
  for (const o of JSON.parse(r.options) as BatchOption[]) {
    for (const [code, score] of Object.entries(o.scoring)) {
      computed[code] = Math.max(computed[code] ?? 0, score)
    }
  }
  maxJson.per_question_max[qnum] = computed
}

// global_max_scores: прибавляем дельту новых вопросов (старые значения не трогаем —
// они v2 от психолога, включая 11 известных расхождений)
const delta: Record<string, number> = {}
for (const r of newRecords) {
  const qnum = String(r.sortOrder + 1)
  for (const [code, score] of Object.entries(maxJson.per_question_max[qnum])) {
    delta[code] = (delta[code] ?? 0) + score
  }
}
for (const code of ALL_CODES) {
  maxJson.global_max_scores[code] = (maxJson.global_max_scores[code] ?? 0) + (delta[code] ?? 0)
}
maxJson.metadata.total_questions = dump.length + newRecords.length
maxJson.metadata.parsed_questions = dump.length + newRecords.length
maxJson.metadata.scales = ALL_CODES

// ── Отчёт ──────────────────────────────────────────────────────────────────
console.log(`Новых вопросов: ${newRecords.length} (sortOrder ${dump.length}..${sortOrder - 1})`)
console.log('Дельта max-баллов по шкалам:')
for (const code of ALL_CODES) {
  if (delta[code]) {
    console.log(`  ${code}: +${delta[code]} → ${maxJson.global_max_scores[code]}`)
  }
}
console.log('\nGLOBAL_MAX_SCORES для personality-types.ts:')
console.log('{\n' + ALL_CODES.map((c) => `  ${c}: ${maxJson.global_max_scores[c]},`).join('\n') + '\n}')

if (dryRun) {
  console.log('\n--dry-run: файлы не изменены')
} else {
  writeFileSync(DUMP, JSON.stringify([...dump, ...newRecords], null, 1), 'utf-8')
  writeFileSync(MAXJSON, JSON.stringify(maxJson, null, 2), 'utf-8')
  console.log('\nФайлы обновлены: questions-dump.json, max-scores-per-question.json')
}
