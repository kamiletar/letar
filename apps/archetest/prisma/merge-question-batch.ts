/**
 * Влить батчи новых вопросов (prisma/question-batches/<dir>/) в банк:
 * - questions-dump.json: append с id/sortOrder/createdAt
 * - max-scores-per-question.json: per_question_max + global_max_scores + metadata
 *
 * Запуск: npx tsx apps/archetest/prisma/merge-question-batch.ts [--batch 5.5] [--dry-run]
 * По умолчанию --batch 5.1 (обратная совместимость).
 * Идемпотентность: скрипт откажется работать, если сценарий батча уже есть в дампе.
 *
 * Режим правок (вердикты «Править» от ревьюера по уже влитым вопросам):
 *   ... --batch 5.1 --update [--allow-scoring-change] [--dry-run]
 * Обрабатываются только вопросы с полем `_updateOf` (id записи в дампе или её
 * прежний `scenario`); остальные игнорируются, поэтому правки дописываются
 * в тот же батч-файл рядом с исходными вопросами.
 * Правка, меняющая баллы, требует `--allow-scoring-change` и бампа
 * QUESTION_BANK_VERSION: сдвиг actual_max делает старые сессии несопоставимыми.
 *
 * Экспериментальные батчи (5.5) скорят ТОЛЬКО экспериментальные шкалы — actual_max
 * ядра 22 не меняется, поэтому QUESTION_BANK_VERSION остаётся прежним.
 */
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname)
const DUMP = join(ROOT, 'questions-dump.json')
const MAXJSON = join(ROOT, '..', 'src', 'app', '[locale]', '_data', 'max-scores-per-question.json')

/** Ядро 22 шкалы */
const CORE_CODES = [
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
/** Экспериментальные шкалы вне ядра (этап 5.5) */
const EXPERIMENTAL_CODES = ['RES_PHYS', 'RES_AFF', 'SPEC_INT']

/** Конфигурация батча — задаёт директорию, состав и правила валидации */
interface BatchConfig {
  /** Поддиректория question-batches/ */
  dir: string
  /** Порядок шкал (фиксирован — от него зависят sortOrder новых вопросов) */
  order: string[]
  /** Ожидаемое число вопросов в каждом файле шкалы */
  perScale: number
  /** Минимум reverse-вопросов на шкалу (≥ 1/3) */
  minReverse: number
  /** Коды, которыми варианты вправе скорить (изоляция ядра для экспериментальных) */
  allowedScoringCodes: string[]
}

const CONFIGS: Record<string, BatchConfig> = {
  '5.1': {
    dir: '5.1',
    order: ['MAC', 'HUM', 'KAN', 'FAI', 'SAD', 'MAS', 'ASD', 'DIR', 'ALX'],
    perScale: 15,
    minReverse: 5,
    allowedScoringCodes: CORE_CODES,
  },
  '5.5': {
    dir: '5.5',
    order: EXPERIMENTAL_CODES,
    perScale: 10,
    minReverse: 4,
    // Только экспериментальные коды: варианты не касаются ядра → actual_max ядра неизменен
    allowedScoringCodes: EXPERIMENTAL_CODES,
  },
  // Новая шкала «Доброжелательность» (HEXACO Honesty-Humility).
  // ⚠️ НЕ вливать до возврата вердиктов ревьюера (дедлайн 02.08) и до того,
  // как HON появится в ALL_SCALE_CODES приложения. Сейчас конфиг нужен для
  // `--dry-run`: он прогоняет батч через ту же валидацию, что и боевой merge.
  // Изоляция скоринга (только HON) — методологическое требование, см.
  // docs/honesty-humility-brief.md: общие пункты с тёмными шкалами сделали бы
  // будущую корреляцию артефактом дизайна.
  hh: {
    dir: 'hh',
    order: ['HON'],
    perScale: 15,
    minReverse: 5,
    allowedScoringCodes: ['HON'],
  },
}

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
  /** Фасет конструкта — только для таблицы ревьюера, в банк не попадает */
  _facet?: string
  /**
   * Правка уже влитого вопроса (режим `--update`): `id` записи в дампе либо
   * её прежний `scenario`. Без этого поля вопрос считается новым.
   */
  _updateOf?: string
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
/**
 * Режим правки уже влитых вопросов (вердикты «Править» от ревьюера).
 * Обрабатывает только вопросы с полем `_updateOf`; остальные игнорирует.
 */
const updateMode = process.argv.includes('--update')
/**
 * Разрешить правку, меняющую баллы вопроса. По умолчанию запрещена: изменение
 * скоринга двигает `actual_max` шкал, а значит делает уже записанные сессии
 * несопоставимыми с новыми — это осознанный бамп QUESTION_BANK_VERSION,
 * а не побочный эффект вычитки формулировок.
 */
const allowScoringChange = process.argv.includes('--allow-scoring-change')
const batchArg = process.argv.find((a, i) => process.argv[i - 1] === '--batch') ?? '5.1'
const config = CONFIGS[batchArg]
if (!config) {
  throw new Error(`Неизвестный батч «${batchArg}». Доступны: ${Object.keys(CONFIGS).join(', ')}`)
}
const BATCH_DIR = join(ROOT, 'question-batches', config.dir)
const allowed = new Set(config.allowedScoringCodes)

// ── Загрузка и валидация батчей ────────────────────────────────────────────
const batches = new Map<string, BatchQuestion[]>()
for (const scale of config.order) {
  const all = JSON.parse(readFileSync(join(BATCH_DIR, `${scale}.json`), 'utf-8')) as BatchQuestion[]
  // В режиме правок берём только помеченные `_updateOf`, в обычном — только новые.
  // Так один батч-файл живёт дальше после вливания: правки дописываются в него же.
  const qs = all.filter((q) => (updateMode ? q._updateOf : !q._updateOf))

  if (!updateMode) {
    if (qs.length !== config.perScale) {
      throw new Error(`${scale}: ожидалось ${config.perScale} вопросов, получено ${qs.length}`)
    }
    const reverseCount = qs.filter((q) => q._reverse).length
    if (reverseCount < config.minReverse) {
      throw new Error(`${scale}: reverse-вопросов ${reverseCount} < ${config.minReverse} (нужно ≥ 1/3)`)
    }
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
        if (!allowed.has(code)) {
          throw new Error(`${scale} #${i}: шкала ${code} вне допустимых для батча ${config.dir}`)
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
if (!updateMode) {
  for (const [scale, qs] of batches) {
    for (const q of qs) {
      if (existingScenarios.has(q.scenario)) {
        throw new Error(
          `${scale}: сценарий уже в дампе — «${q.scenario.slice(0, 50)}…». `
            + `Повторный merge? Если это правка формулировки — добавьте вопросу поле `
            + `"_updateOf" (id записи или её прежний scenario) и запустите с --update.`,
        )
      }
    }
  }
}

// ── Справочник max-баллов (нужен обоим режимам) ────────────────────────────
interface MaxJsonShape {
  metadata: { total_questions: number; parsed_questions: number; scales: string[]; description: string }
  global_max_scores: Record<string, number>
  per_question_max: Record<string, Record<string, number>>
}
const maxJsonData = JSON.parse(readFileSync(MAXJSON, 'utf-8')) as MaxJsonShape

/** Максимальный балл каждой шкалы по вариантам вопроса */
function computeQuestionMax(options: BatchOption[]): Record<string, number> {
  const computed: Record<string, number> = {}
  for (const o of options) {
    for (const [code, score] of Object.entries(o.scoring)) {
      computed[code] = Math.max(computed[code] ?? 0, score)
    }
  }
  return computed
}

// ── Режим правок: применить вердикты «Править» к уже влитым вопросам ───────
if (updateMode) {
  const byId = new Map(dump.map((q) => [q.id, q]))
  const byScenario = new Map(dump.map((q) => [q.scenario, q]))

  let touched = 0
  const scoringDelta: Record<string, number> = {}
  const report: string[] = []

  for (const [scale, qs] of batches) {
    for (const q of qs) {
      const key = q._updateOf!
      const target = byId.get(key) ?? byScenario.get(key)
      if (!target) {
        throw new Error(
          `${scale}: не найден вопрос для правки — "_updateOf": «${key.slice(0, 60)}…». `
            + `Ожидается id записи в questions-dump.json или её прежний scenario.`,
        )
      }

      const qnum = String(target.sortOrder + 1)
      const oldMax = maxJsonData.per_question_max[qnum] ?? {}
      const newMax = computeQuestionMax(q.options)
      const codes = [...new Set([...Object.keys(oldMax), ...Object.keys(newMax)])]

      /**
       * Сдвинулся ли максимум вопроса — от этого зависит `actual_max` шкалы
       * и, значит, знаменатель нормализации.
       */
      const maxChanged = codes.some((c) => (oldMax[c] ?? 0) !== (newMax[c] ?? 0))

      /**
       * Изменились ли баллы вариантов. Проверяется отдельно от максимума и шире:
       * правка балла с 1 на 3 при варианте-«тройке» рядом максимум не двигает,
       * но меняет `raw` каждого, кто выбрал этот вариант, — включая уже
       * записанные сессии, потому что баллы пересчитываются из вариантов,
       * а не хранятся в ответе.
       */
      const oldOptions = JSON.parse(target.options) as BatchOption[]
      const scoringChanged = maxChanged
        || oldOptions.length !== q.options.length
        || q.options.some((o, idx) => JSON.stringify(o.scoring) !== JSON.stringify(oldOptions[idx]?.scoring ?? {}))

      if (scoringChanged && !allowScoringChange) {
        throw new Error(
          `${scale}: правка вопроса #${qnum} меняет баллы`
            + (maxChanged
              ? ` — максимум вопроса: ${codes.map((c) => `${c} ${oldMax[c] ?? 0}→${newMax[c] ?? 0}`).join(', ')}`
              : ' в вариантах (максимум вопроса при этом не сдвинулся)')
            + `. Баллы пересчитываются из вариантов при каждом чтении, поэтому изменение задевает `
            + `и уже записанные сессии. Если оно осознанное — перезапустите с --allow-scoring-change `
            + `и поднимите QUESTION_BANK_VERSION в src/app/[locale]/_data/question-bank-version.ts.`,
        )
      }

      const textChanged = target.scenario !== q.scenario
        || target.scenarioEn !== q.scenarioEn
        || target.options
          !== JSON.stringify(q.options.map((o) => ({ text: o.text, textEn: o.textEn, scoring: o.scoring })))
      if (!textChanged && !scoringChanged) {
        report.push(`  #${qnum} (${scale}): без изменений, пропущен`)
        continue
      }

      // Дубль после правки: новая формулировка не должна совпасть с чужим вопросом
      const clash = byScenario.get(q.scenario)
      if (clash && clash.id !== target.id) {
        throw new Error(`${scale}: после правки сценарий #${qnum} совпадёт с вопросом ${clash.id}`)
      }

      byScenario.delete(target.scenario)
      target.scenario = q.scenario
      target.scenarioEn = q.scenarioEn
      target.options = JSON.stringify(q.options.map((o) => ({ text: o.text, textEn: o.textEn, scoring: o.scoring })))
      byScenario.set(target.scenario, target)

      if (maxChanged) {
        for (const c of codes) {
          const diff = (newMax[c] ?? 0) - (oldMax[c] ?? 0)
          if (diff !== 0) {
            scoringDelta[c] = (scoringDelta[c] ?? 0) + diff
          }
        }
        maxJsonData.per_question_max[qnum] = newMax
      }

      touched++
      report.push(`  #${qnum} (${scale}): ${scoringChanged ? 'текст + баллы' : 'только текст'}`)
    }
  }

  for (const [code, diff] of Object.entries(scoringDelta)) {
    maxJsonData.global_max_scores[code] = (maxJsonData.global_max_scores[code] ?? 0) + diff
  }

  console.log(`Режим правок (--update), батч: ${config.dir}`)
  console.log(`Обновлено вопросов: ${touched}`)
  for (const line of report) {
    console.log(line)
  }
  if (Object.keys(scoringDelta).length > 0) {
    console.log('Сдвиг global_max_scores:')
    for (const [code, diff] of Object.entries(scoringDelta)) {
      console.log(`  ${code}: ${diff > 0 ? '+' : ''}${diff} → ${maxJsonData.global_max_scores[code]}`)
    }
    console.log('⚠️ Баллы изменены — поднимите QUESTION_BANK_VERSION, иначе история сессий поедет')
  }

  if (dryRun) {
    console.log('\n--dry-run: файлы не изменены')
  } else if (touched > 0) {
    writeFileSync(DUMP, JSON.stringify(dump, null, 1), 'utf-8')
    writeFileSync(MAXJSON, JSON.stringify(maxJsonData, null, 2), 'utf-8')
    console.log('\nФайлы обновлены: questions-dump.json, max-scores-per-question.json')
  } else {
    console.log('\nНечего применять')
  }

  process.exit(0)
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
for (const scale of config.order) {
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
const maxJson = maxJsonData

for (const r of newRecords) {
  const qnum = String(r.sortOrder + 1)
  if (maxJson.per_question_max[qnum]) {
    throw new Error(`per_question_max["${qnum}"] уже существует`)
  }
  maxJson.per_question_max[qnum] = computeQuestionMax(JSON.parse(r.options) as BatchOption[])
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
// Обновляем всё, что встретилось в дельте, включая шкалы, которых в справочнике
// ещё нет вовсе: новая шкала (как HON) иначе молча не получила бы global_max_scores,
// и нормализация по ней поехала бы с первого же прохождения
const allTouched = [
  ...new Set([...CORE_CODES, ...EXPERIMENTAL_CODES, ...Object.keys(maxJson.global_max_scores), ...Object.keys(delta)]),
]
for (const code of allTouched) {
  if (delta[code]) {
    maxJson.global_max_scores[code] = (maxJson.global_max_scores[code] ?? 0) + delta[code]
  }
}
maxJson.metadata.total_questions = dump.length + newRecords.length
maxJson.metadata.parsed_questions = dump.length + newRecords.length
maxJson.metadata.scales = [...CORE_CODES, ...EXPERIMENTAL_CODES]

// ── Отчёт ──────────────────────────────────────────────────────────────────
console.log(`Батч: ${config.dir}`)
console.log(`Новых вопросов: ${newRecords.length} (sortOrder ${dump.length}..${sortOrder - 1})`)
console.log('Дельта max-баллов по шкалам:')
for (const code of allTouched) {
  if (delta[code]) {
    console.log(`  ${code}: +${delta[code]} → ${maxJson.global_max_scores[code]}`)
  }
}

if (dryRun) {
  console.log('\n--dry-run: файлы не изменены')
} else {
  writeFileSync(DUMP, JSON.stringify([...dump, ...newRecords], null, 1), 'utf-8')
  writeFileSync(MAXJSON, JSON.stringify(maxJson, null, 2), 'utf-8')
  console.log('\nФайлы обновлены: questions-dump.json, max-scores-per-question.json')
}
