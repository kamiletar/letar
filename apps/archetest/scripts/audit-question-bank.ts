/**
 * Этап 5.10, часть A — машинный аудит всего банка вопросов.
 *
 * Банк (2126 вопросов) ни разу не проверялся целиком: ядро v1 (1955 вопросов,
 * 19.03.2026) вошло в тест до появления нынешних критериев качества, ревью 5.1/5.5
 * покрывает только 165 вопросов. Скрипт ловит структурные дефекты и показывает,
 * куда направлять дорогое человеческое внимание (часть B — выборка ревьюеру).
 *
 * Проверки:
 *   1. Точные дубли и почти-дубли сценариев — два сигнала: триграммный Жаккар
 *      (почти дословные переформулировки) и IDF-взвешенное пересечение редких
 *      смысловых слов (один сюжет в разных формулировках — «нашли кошелёк» ×2)
 *   2. Вопросы, которые ничего не измеряют (пустой скоринг вне attention-check)
 *   3. Расхождения дамп ↔ справочник max-баллов (+ дрейф global_max_scores)
 *   4. Покрытие шкал: релевантные вопросы по каждой из 25, дефицит до порога high
 *   5. Асимметрия вариантов: нет дистракторов / слабый сигнал / вариант-вездеход,
 *      баллы вне диапазона 1..3
 *   6. Полнота EN-локализации (пустые или совпадающие с RU тексты)
 *   7. Reverse-баланс по шкалам (метки `_reverse` есть только в батчах 5.1/5.5)
 *
 * Запуск: npx tsx apps/archetest/scripts/audit-question-bank.ts
 * Отчёты: docs/question-bank-audit.md (человеку) + docs/question-bank-audit.json
 * (полные списки — сырьё для пакета ревьюера части B).
 *
 * ⚠️ Скрипт строго read-only по отношению к банку: questions-dump.json,
 * max-scores-per-question.json и QUESTION_BANK_VERSION не изменяются. Любая правка
 * банка по итогам аудита — отдельное решение (см. PLAN.md §5.10, «Границы»).
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { TOTAL_QUESTIONS } from '../src/app/[locale]/_data/bank-stats'
import { ALL_SCALE_CODES, EXPERIMENTAL_SCALE_CODES } from '../src/app/[locale]/_data/personality-types'
import { VALIDITY_CHECKS } from '../src/app/[locale]/_data/validity-checks'
import { CONFIDENCE_THRESHOLDS } from '../src/app/[locale]/_lib/scoring-core'
import { collapseRanges, contentStems, jaccard, normalizeText, trigrams } from './audit-lib'

const ROOT = join(__dirname, '..')
const DUMP = join(ROOT, 'prisma', 'questions-dump.json')
const MAXJSON = join(ROOT, 'src', 'app', '[locale]', '_data', 'max-scores-per-question.json')
const BATCHES_DIR = join(ROOT, 'prisma', 'question-batches')
const OUT_MD = join(ROOT, 'docs', 'question-bank-audit.md')
const OUT_JSON = join(ROOT, 'docs', 'question-bank-audit.json')

/**
 * Известные расхождения дамп ↔ справочник — копия списка из
 * src/app/[locale]/_data/question-bank.test.ts (KNOWN_DISCREPANCIES).
 * Нужны только чтобы разметить в отчёте «известное/новое»; сам аудит
 * пересчитывает всё с нуля. Детали: docs/question-bank-discrepancies.md.
 */
const KNOWN_DISCREPANCIES = new Set([
  '691',
  '1946',
  '1947',
  '1948',
  '1949',
  '1950',
  '1951',
  '1952',
  '1953',
  '1954',
  '1955',
])

/** Пороги триграммного Жаккара для почти-дублей (дословные переформулировки) */
const NEAR_DUP_MIN = 0.5 // ниже — не считаем находкой вовсе
const NEAR_DUP_STRONG = 0.65 // порог попадания в MD-отчёт
const NEAR_DUP_EXACTISH = 0.8 // «почти дословный» бакет

/**
 * Пороги сюжетных дублей (IDF-взвешенный containment по стемам смысловых слов).
 * Триграммы не ловят один сюжет в формулировках разной длины: контрольные пары
 * из PLAN («нашли кошелёк» №43↔№1176, «кассир дал больше сдачи» №8↔№1986)
 * имеют триграммный Жаккар 0.1–0.2, но containment 0.55–0.75.
 */
const STORY_DUP_MIN = 0.5 // ниже — не находка (в JSON не попадает)
const STORY_DUP_STRONG = 0.6 // порог попадания в MD-отчёт (при редком ядре)
const STORY_DUP_SURE = 0.8 // в MD-отчёт даже без редкого ядра
const STORY_MIN_SHARED_STEMS = 2 // один общий редкий стем — ещё не сюжет
const STORY_MIN_STEMS = 3 // слишком короткие сценарии не сравниваем
/**
 * «Редкое ядро»: настоящий сюжетный дубль почти всегда держится на редком слове
 * (кошелёк, кассир, дресс-код). Пары в 0.6–0.8, где все общие стемы частые
 * («все» + «смотрят/смотрели»), — в основном шум; они остаются в JSON, но MD
 * не засоряют.
 */
const STORY_RARE_DF = 25

/** Вариант, скорящий столько шкал сразу, размывает измерение */
const FAT_OPTION_SCALES = 5

interface DumpQuestion {
  id: string
  scenario: string
  scenarioEn: string
  options: string
  active: boolean
  sortOrder: number
  createdAt: string
}

interface OptionData {
  text: string
  textEn: string
  scoring: Record<string, number>
}

interface ParsedQuestion {
  /** Номер в справочнике максимумов: sortOrder + 1 */
  qnum: number
  id: string
  scenario: string
  scenarioEn: string
  options: OptionData[]
  active: boolean
}

// ── Вспомогательное форматирование ─────────────────────────────────────────

/** Обрезка сценария для читаемости отчёта */
function short(s: string, n = 70): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}

// ── Загрузка данных ────────────────────────────────────────────────────────

const dump = (JSON.parse(readFileSync(DUMP, 'utf-8')) as DumpQuestion[]).map((q): ParsedQuestion => ({
  qnum: q.sortOrder + 1,
  id: q.id,
  scenario: q.scenario,
  scenarioEn: q.scenarioEn,
  options: JSON.parse(q.options) as OptionData[],
  active: q.active,
}))

interface MaxJsonShape {
  metadata: { total_questions: number; scales: string[] }
  global_max_scores: Record<string, number>
  per_question_max: Record<string, Record<string, number>>
}
const maxJson = JSON.parse(readFileSync(MAXJSON, 'utf-8')) as MaxJsonShape

const validitySortOrders = new Set(VALIDITY_CHECKS.map((c) => c.sortOrder))
const scoredCodes: string[] = [...ALL_SCALE_CODES, ...EXPERIMENTAL_SCALE_CODES]

// ── Самопроверки входных данных (fail-fast: аудит на битых данных бессмыслен) ──

if (dump.length !== TOTAL_QUESTIONS) {
  throw new Error(`Дамп: ${dump.length} вопросов, bank-stats обещает ${TOTAL_QUESTIONS} — сначала синхронизируйте`)
}
if (Object.keys(maxJson.per_question_max).length !== dump.length) {
  throw new Error(
    `Справочник: ${Object.keys(maxJson.per_question_max).length} записей против ${dump.length} вопросов дампа`
  )
}
if (VALIDITY_CHECKS.length !== 6) {
  throw new Error(`Ожидалось 6 attention-check вопросов, в validity-checks.ts их ${VALIDITY_CHECKS.length}`)
}

// ── 1. Точные дубли и почти-дубли сценариев ────────────────────────────────

const byNorm = new Map<string, ParsedQuestion[]>()
for (const q of dump) {
  const norm = normalizeText(q.scenario)
  const bucket = byNorm.get(norm)
  if (bucket) {
    bucket.push(q)
  } else {
    byNorm.set(norm, [q])
  }
}
const exactDuplicates = [...byNorm.values()]
  .filter((g) => g.length > 1)
  .map((g) => ({ qnums: g.map((q) => q.qnum), scenario: g[0].scenario }))

interface NearDupPair {
  a: number
  b: number
  similarity: number
  scenarioA: string
  scenarioB: string
}

/**
 * Почти-дубли: полный перебор пар с триграммным Жаккаром.
 * Пары, уже совпавшие точно (нормализованно), исключаются. Предфильтр по размеру
 * множеств: J ≥ порога недостижим, если множества различаются больше, чем в
 * 1/порог раз, — отсекает большинство пар без подсчёта пересечения.
 */
const items = dump.map((q) => ({ qnum: q.qnum, scenario: q.scenario, norm: normalizeText(q.scenario) }))
const grams = items.map((it) => trigrams(it.norm))
const nearDuplicates: NearDupPair[] = []
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    if (items[i].norm === items[j].norm) {
      continue // уже в точных дублях
    }
    const sizeA = grams[i].size
    const sizeB = grams[j].size
    if (Math.min(sizeA, sizeB) < Math.max(sizeA, sizeB) * NEAR_DUP_MIN) {
      continue
    }
    const sim = jaccard(grams[i], grams[j])
    if (sim >= NEAR_DUP_MIN) {
      nearDuplicates.push({
        a: items[i].qnum,
        b: items[j].qnum,
        similarity: Math.round(sim * 1000) / 1000,
        scenarioA: items[i].scenario,
        scenarioB: items[j].scenario,
      })
    }
  }
}
nearDuplicates.sort((x, y) => y.similarity - x.similarity)

/**
 * Сюжетные дубли: IDF-взвешенный containment по стемам смысловых слов.
 * containment(A, B) = Σ idf(общие стемы) / min(Σ idf(A), Σ idf(B)) — устойчив
 * к разной длине формулировок (в отличие от Жаккара, где длинный вопрос
 * «разбавляет» короткий). Требуются ≥ STORY_MIN_SHARED_STEMS общих стемов,
 * чтобы один сверхредкий стем не порождал пару.
 */
const stemSets = items.map((it) => contentStems(it.norm))
const df = new Map<string, number>()
for (const stems of stemSets) {
  for (const stem of stems) {
    df.set(stem, (df.get(stem) ?? 0) + 1)
  }
}
const idf = (stem: string) => Math.log(items.length / (df.get(stem) ?? 1))
const idfSums = stemSets.map((stems) => [...stems].reduce((acc, s) => acc + idf(s), 0))

interface StoryDupPair extends NearDupPair {
  sharedStems: string[]
  /** Среди общих стемов есть редкий (df ≤ STORY_RARE_DF) — сюжетное ядро */
  rareCore: boolean
}

const nearDupKeys = new Set(nearDuplicates.map((p) => `${p.a}:${p.b}`))
const storyDuplicates: StoryDupPair[] = []
for (let i = 0; i < items.length; i++) {
  if (stemSets[i].size < STORY_MIN_STEMS) {
    continue
  }
  for (let j = i + 1; j < items.length; j++) {
    if (stemSets[j].size < STORY_MIN_STEMS || items[i].norm === items[j].norm) {
      continue
    }
    if (nearDupKeys.has(`${items[i].qnum}:${items[j].qnum}`)) {
      continue // уже пойман триграммами — не дублируем находку
    }
    const [small, big] = stemSets[i].size <= stemSets[j].size ? [stemSets[i], stemSets[j]] : [stemSets[j], stemSets[i]]
    const shared: string[] = []
    let sharedIdf = 0
    for (const stem of small) {
      if (big.has(stem)) {
        shared.push(stem)
        sharedIdf += idf(stem)
      }
    }
    if (shared.length < STORY_MIN_SHARED_STEMS) {
      continue
    }
    const containment = sharedIdf / Math.min(idfSums[i], idfSums[j])
    if (containment >= STORY_DUP_MIN) {
      storyDuplicates.push({
        a: items[i].qnum,
        b: items[j].qnum,
        similarity: Math.round(containment * 1000) / 1000,
        scenarioA: items[i].scenario,
        scenarioB: items[j].scenario,
        sharedStems: shared,
        rareCore: shared.some((s) => (df.get(s) ?? 0) <= STORY_RARE_DF),
      })
    }
  }
}
storyDuplicates.sort((x, y) => y.similarity - x.similarity)

// ── 2. Вопросы, которые ничего не измеряют ─────────────────────────────────

/** Пустой скоринг по дампу (все варианты без положительных баллов), вне attention-check */
const emptyScoring = dump
  .filter((q) => !validitySortOrders.has(q.qnum - 1))
  .filter((q) => q.options.every((o) => Object.values(o.scoring).every((s) => s <= 0)))
  .map((q) => ({ qnum: q.qnum, scenario: q.scenario }))

/** Пустые записи справочника вне attention-check (как видит прод) */
const emptyInRef = Object.entries(maxJson.per_question_max)
  .filter(([qnum]) => !validitySortOrders.has(Number(qnum) - 1))
  .filter(([, scores]) => Object.values(scores).every((s) => s <= 0))
  .map(([qnum]) => Number(qnum))

// ── 3. Расхождения дамп ↔ справочник ───────────────────────────────────────

interface Discrepancy {
  qnum: number
  scenario: string
  /** Шкала → [макс по дампу, макс по справочнику] */
  diff: Record<string, [number, number]>
}

const discrepancies: Discrepancy[] = []
for (const q of dump) {
  const computed: Record<string, number> = {}
  for (const o of q.options) {
    for (const [code, score] of Object.entries(o.scoring)) {
      computed[code] = Math.max(computed[code] ?? 0, score)
    }
  }
  const ref: Record<string, number> = {}
  for (const [code, score] of Object.entries(maxJson.per_question_max[String(q.qnum)] ?? {})) {
    if (score > 0) {
      ref[code] = score
    }
  }
  const codes = [...new Set([...Object.keys(computed), ...Object.keys(ref)])]
  const diff: Record<string, [number, number]> = {}
  for (const code of codes) {
    if ((computed[code] ?? 0) !== (ref[code] ?? 0)) {
      diff[code] = [computed[code] ?? 0, ref[code] ?? 0]
    }
  }
  if (Object.keys(diff).length > 0) {
    discrepancies.push({ qnum: q.qnum, scenario: q.scenario, diff })
  }
}
const knownFound = discrepancies.filter((d) => KNOWN_DISCREPANCIES.has(String(d.qnum)))
const newDiscrepancies = discrepancies.filter((d) => !KNOWN_DISCREPANCIES.has(String(d.qnum)))

/** Дрейф global_max_scores: заявленное значение против суммы per_question_max */
const globalMaxDrift: Record<string, { declared: number; recomputed: number }> = {}
for (const code of Object.keys(maxJson.global_max_scores)) {
  let sum = 0
  for (const scores of Object.values(maxJson.per_question_max)) {
    sum += scores[code] ?? 0
  }
  if (sum !== maxJson.global_max_scores[code]) {
    globalMaxDrift[code] = { declared: maxJson.global_max_scores[code], recomputed: sum }
  }
}

// ── 4. Покрытие шкал и дефицит до порога high ──────────────────────────────

interface ScaleCoverage {
  code: string
  /** Релевантных вопросов по справочнику — так видит прод (confidence, стратификация) */
  relevantRef: number
  /** Релевантных вопросов по дампу — фактическое содержимое банка */
  relevantDump: number
  /** Сколько вопросов не хватает до порога high (30 отвеченных релевантных) */
  deficitToHigh: number
  globalMax: number
}

const coverage: ScaleCoverage[] = scoredCodes.map((code) => {
  let relevantRef = 0
  for (const scores of Object.values(maxJson.per_question_max)) {
    if ((scores[code] ?? 0) > 0) {
      relevantRef++
    }
  }
  let relevantDump = 0
  for (const q of dump) {
    if (q.options.some((o) => (o.scoring[code] ?? 0) > 0)) {
      relevantDump++
    }
  }
  return {
    code,
    relevantRef,
    relevantDump,
    deficitToHigh: Math.max(0, CONFIDENCE_THRESHOLDS.high - relevantDump),
    globalMax: maxJson.global_max_scores[code] ?? 0,
  }
})
coverage.sort((a, b) => a.relevantDump - b.relevantDump)

// ── 5. Асимметрия вариантов ────────────────────────────────────────────────

/** Все варианты скорят одну и ту же единственную шкалу — любой ответ двигает её, вопрос не различает */
const singleScaleAllOptions: { qnum: number; scenario: string; code: string }[] = []
/** Непустой скоринг, но ни одна шкала не получает ≥ 2 — сигнал слабее шума */
const weakSignal: { qnum: number; scenario: string }[] = []
/** Вариант скорит FAT_OPTION_SCALES и больше шкал сразу */
const fatOptions: { qnum: number; scenario: string; optionIndex: number; scales: number }[] = []
/** Баллы вне диапазона 1..3 (валидация merge появилась только в 5.1 — ядро v1 не проверялось) */
const outOfRangeScores: { qnum: number; scenario: string; code: string; score: number }[] = []

for (const q of dump) {
  if (validitySortOrders.has(q.qnum - 1)) {
    continue
  }
  const perOptionScales = q.options.map((o) =>
    Object.entries(o.scoring)
      .filter(([, s]) => s > 0)
      .map(([code]) => code)
  )
  const union = new Set(perOptionScales.flat())

  if (union.size === 1 && perOptionScales.every((codes) => codes.length > 0)) {
    singleScaleAllOptions.push({ qnum: q.qnum, scenario: q.scenario, code: [...union][0] })
  }

  const maxScore = Math.max(0, ...q.options.flatMap((o) => Object.values(o.scoring)))
  if (union.size > 0 && maxScore < 2) {
    weakSignal.push({ qnum: q.qnum, scenario: q.scenario })
  }

  for (const [idx, codes] of perOptionScales.entries()) {
    if (codes.length >= FAT_OPTION_SCALES) {
      fatOptions.push({ qnum: q.qnum, scenario: q.scenario, optionIndex: idx, scales: codes.length })
    }
  }

  for (const o of q.options) {
    for (const [code, score] of Object.entries(o.scoring)) {
      if (!Number.isInteger(score) || score < 1 || score > 3) {
        outOfRangeScores.push({ qnum: q.qnum, scenario: q.scenario, code, score })
      }
    }
  }
}

// ── 6. Полнота EN ──────────────────────────────────────────────────────────

/** EN-текст «не переведён»: пуст, содержит кириллицу или совпадает с RU */
function isUntranslated(en: string, ru: string): boolean {
  return !en.trim() || /[а-яё]/i.test(en) || normalizeText(en) === normalizeText(ru)
}

const enScenarioUntranslated = dump.filter((q) => isUntranslated(q.scenarioEn, q.scenario)).map((q) => q.qnum)
/** Вопросы, у которых хотя бы один вариант не переведён (+ сколько именно) */
const enOptionsUntranslated = dump
  .map((q) => ({
    qnum: q.qnum,
    options: q.options.filter((o) => isUntranslated(o.textEn, o.text)).length,
    total: q.options.length,
  }))
  .filter((x) => x.options > 0)

// ── 7. Reverse-баланс по батчам ────────────────────────────────────────────

interface ReverseStat {
  scale: string
  batch: string
  total: number
  reverse: number
  merged: boolean
}

const byScenario = new Map(dump.map((q) => [q.scenario, q]))
const reverseStats: ReverseStat[] = []
for (const batchDir of readdirSync(BATCHES_DIR)) {
  for (const file of readdirSync(join(BATCHES_DIR, batchDir))) {
    if (!file.endsWith('.json')) {
      continue
    }
    const scale = file.replace('.json', '')
    const questions = JSON.parse(readFileSync(join(BATCHES_DIR, batchDir, file), 'utf-8')) as {
      scenario: string
      _reverse?: boolean
      _updateOf?: string
    }[]
    const fresh = questions.filter((q) => !q._updateOf)
    const merged = fresh.every((q) => byScenario.has(q.scenario))
    reverseStats.push({
      scale,
      batch: batchDir,
      total: fresh.length,
      reverse: fresh.filter((q) => q._reverse).length,
      merged,
    })
  }
}

const v1Count = dump.length - reverseStats.filter((r) => r.merged).reduce((acc, r) => acc + r.total, 0)

// ── Контроль ожиданий против известных фактов ──────────────────────────────

const missingKnown = [...KNOWN_DISCREPANCIES].filter((k) => !discrepancies.some((d) => String(d.qnum) === k))
if (missingKnown.length > 0) {
  console.warn(`⚠️ Известные расхождения не воспроизвелись (банк изменился?): ${missingKnown.join(', ')}`)
}

// ── Отчёты ─────────────────────────────────────────────────────────────────

const now = new Date().toISOString().slice(0, 10)
const strongPairs = nearDuplicates.filter((p) => p.similarity >= NEAR_DUP_STRONG)
const strongStory = storyDuplicates.filter(
  (p) => p.similarity >= STORY_DUP_SURE || (p.similarity >= STORY_DUP_STRONG && p.rareCore)
)

const summaryRows: [string, number, string][] = [
  ['Точные дубли сценариев (групп)', exactDuplicates.length, 'решить, какой вопрос оставить'],
  [`Почти-дубли формулировок (Жаккар ≥ ${NEAR_DUP_STRONG})`, strongPairs.length, 'список пар на решение — часть B'],
  [`Сюжетные дубли (containment ≥ ${STORY_DUP_STRONG})`, strongStory.length, 'список пар на решение — часть B'],
  [
    `Слабее порога (Жаккар/containment ≥ ${NEAR_DUP_MIN})`,
    nearDuplicates.length - strongPairs.length + storyDuplicates.length - strongStory.length,
    'полный список в JSON',
  ],
  ['Вопросы без скоринга (вне attention-check)', emptyScoring.length, 'кандидаты на деактивацию'],
  ['Расхождения дамп ↔ справочник: известные', knownFound.length, 'разобрать с ревьюером (техдолг)'],
  [
    'Расхождения дамп ↔ справочник: НОВЫЕ',
    newDiscrepancies.length,
    newDiscrepancies.length > 0 ? '⚠️ немедленно разобраться' : 'не обнаружено',
  ],
  [
    'Дрейф global_max_scores (шкал)',
    Object.keys(globalMaxDrift).length,
    Object.keys(globalMaxDrift).length > 0 ? '⚠️ пересобрать справочник' : 'не обнаружено',
  ],
  [
    `Шкалы с дефицитом до high (< ${CONFIDENCE_THRESHOLDS.high} вопросов)`,
    coverage.filter((c) => c.deficitToHigh > 0).length,
    'контентная работа — батчи + ревью',
  ],
  ['Вопросы без дистракторов (одна шкала во всех вариантах)', singleScaleAllOptions.length, 'выборочно в часть B'],
  ['Слабый сигнал (max < 2)', weakSignal.length, 'выборочно в часть B'],
  [`Варианты-вездеходы (≥ ${FAT_OPTION_SCALES} шкал)`, fatOptions.length, 'выборочно в часть B'],
  ['Баллы вне 1..3', outOfRangeScores.length, outOfRangeScores.length > 0 ? 'проверить скоринг' : 'не обнаружено'],
  ['EN: сценарий не переведён', enScenarioUntranslated.length, 'EN-квиз показывает русский текст'],
  ['EN: вопросы с непереведёнными вариантами', enOptionsUntranslated.length, ''],
]

const mdLines: string[] = []
mdLines.push('# Аудит банка вопросов — часть A (машинная)')
mdLines.push('')
mdLines.push(`> Сгенерировано \`scripts/audit-question-bank.ts\` ${now}. Не редактировать руками —`)
mdLines.push('> перегенерируется при каждом запуске. Скрипт read-only: банк, справочник максимумов')
mdLines.push('> и `QUESTION_BANK_VERSION` не изменяются (границы — PLAN.md §5.10).')
mdLines.push('>')
mdLines.push(`> Банк: **${dump.length}** вопросов (активных ${dump.filter((q) => q.active).length}), `)
mdLines.push(
  `> из них ${validitySortOrders.size} attention-check (№${[...validitySortOrders].map((s) => s + 1).join(', №')})`
)
mdLines.push(
  `> исключены из проверок скоринга. Ядро v1 — ${v1Count - validitySortOrders.size} вопросов ` +
    `(+ ${validitySortOrders.size} чек-вопросов), батчи 5.1/5.5 — ${dump.length - v1Count}.`
)
mdLines.push('')
mdLines.push('## Сводка')
mdLines.push('')
mdLines.push('| Находка | Число | Что с этим делать |')
mdLines.push('| --- | ---: | --- |')
for (const [name, count, action] of summaryRows) {
  mdLines.push(`| ${name} | ${count} | ${action} |`)
}
mdLines.push('')

mdLines.push('## 1. Дубли и почти-дубли сценариев')
mdLines.push('')
if (exactDuplicates.length === 0) {
  mdLines.push('Точных дублей (после нормализации регистра/пунктуации) не найдено.')
} else {
  mdLines.push('### Точные дубли (нормализованное совпадение)')
  mdLines.push('')
  for (const g of exactDuplicates) {
    mdLines.push(`- №${g.qnums.join(', №')} — «${short(g.scenario)}»`)
  }
}
mdLines.push('')
mdLines.push(`### Почти-дубли (триграммный Жаккар ≥ ${NEAR_DUP_STRONG})`)
mdLines.push('')
if (strongPairs.length === 0) {
  mdLines.push('Не найдено.')
} else {
  mdLines.push('| Сходство | Пара | Сценарии |')
  mdLines.push('| ---: | --- | --- |')
  for (const p of strongPairs) {
    const mark = p.similarity >= NEAR_DUP_EXACTISH ? ' ⚠️' : ''
    mdLines.push(
      `| ${p.similarity}${mark} | №${p.a} ↔ №${p.b} | «${short(p.scenarioA, 60)}» ↔ «${short(p.scenarioB, 60)}» |`
    )
  }
}
mdLines.push('')
mdLines.push('### Сюжетные дубли: одна ситуация в разных формулировках')
mdLines.push('')
mdLines.push('Триграммы такие пары не видят: формулировки разной длины «разбавляют» Жаккар.')
mdLines.push('Метрика — IDF-взвешенная доля общих смысловых слов в более коротком вопросе.')
mdLines.push(`В таблице пары с containment ≥ ${STORY_DUP_SURE}, либо ≥ ${STORY_DUP_STRONG} при общем`)
mdLines.push(`редком слове (df ≤ ${STORY_RARE_DF} — «кошелёк», «кассир», «дресс-код»): сюжет держится`)
mdLines.push('на редком слове, пары только из частых слов — в основном шум (остаются в JSON).')
mdLines.push('')
if (strongStory.length === 0) {
  mdLines.push('Не найдено.')
} else {
  mdLines.push('| Containment | Пара | Общие слова | Сценарии |')
  mdLines.push('| ---: | --- | --- | --- |')
  for (const p of strongStory) {
    mdLines.push(
      `| ${p.similarity} | №${p.a} ↔ №${p.b} | ${p.sharedStems.join(', ')} | «${short(p.scenarioA, 55)}» ↔ «${short(
        p.scenarioB,
        55
      )}» |`
    )
  }
}
mdLines.push('')
mdLines.push(
  `Пар слабее порогов (≥ ${NEAR_DUP_MIN} Жаккар / ≥ ${STORY_DUP_MIN} containment): ` +
    `${nearDuplicates.length - strongPairs.length + storyDuplicates.length - strongStory.length} — ` +
    `полный список в \`question-bank-audit.json\`.`
)
mdLines.push('')

mdLines.push('## 2. Вопросы, которые ничего не измеряют')
mdLines.push('')
if (emptyScoring.length === 0) {
  mdLines.push('Вне шести attention-check вопросов пустого скоринга в дампе нет. Ожидание из PLAN')
  mdLines.push('(«номер 2096: {}») оказалось attention-check вопросом — он без баллов намеренно.')
} else {
  for (const q of emptyScoring) {
    mdLines.push(`- №${q.qnum} — «${short(q.scenario)}»`)
  }
}
if (emptyInRef.length > 0) {
  mdLines.push('')
  mdLines.push(`Пустые записи в справочнике (вне attention-check): №${emptyInRef.join(', №')}.`)
}
mdLines.push('')

mdLines.push('## 3. Расхождения дамп ↔ справочник max-баллов')
mdLines.push('')
mdLines.push(`Всего: ${discrepancies.length} (известных ${knownFound.length}, новых ${newDiscrepancies.length}).`)
mdLines.push('Формат: шкала дамп→справочник. Прод считает достоверность и normalized по справочнику,')
mdLines.push('поэтому каждая строка — систематическая ошибка нормализации затронутых шкал.')
mdLines.push('')
for (const d of discrepancies) {
  const label = KNOWN_DISCREPANCIES.has(String(d.qnum)) ? '' : ' **← НОВОЕ**'
  const diffs = Object.entries(d.diff)
    .map(([code, [c, r]]) => `${code} ${c}→${r}`)
    .join(', ')
  mdLines.push(`- №${d.qnum}${label}: ${diffs} — «${short(d.scenario, 60)}»`)
}
mdLines.push('')
if (Object.keys(globalMaxDrift).length > 0) {
  mdLines.push('### Дрейф global_max_scores')
  mdLines.push('')
  mdLines.push('| Шкала | Заявлено | Пересчитано |')
  mdLines.push('| --- | ---: | ---: |')
  for (const [code, { declared, recomputed }] of Object.entries(globalMaxDrift)) {
    mdLines.push(`| ${code} | ${declared} | ${recomputed} |`)
  }
} else {
  mdLines.push('`global_max_scores` сходится с суммой `per_question_max` по всем шкалам.')
}
mdLines.push('')

mdLines.push('## 4. Покрытие шкал')
mdLines.push('')
mdLines.push(`Порог high-достоверности — ${CONFIDENCE_THRESHOLDS.high} отвеченных релевантных вопросов`)
mdLines.push('(`CONFIDENCE_THRESHOLDS.high`). Если в банке меньше — high по шкале недостижим структурно.')
mdLines.push('«Справочник» — как видит прод (confidence/стратификация), «дамп» — фактическое содержимое;')
mdLines.push('разница между ними — эффект расхождений из раздела 3.')
mdLines.push('')
mdLines.push('| Шкала | Вопросов (дамп) | Вопросов (справочник) | Дефицит до high | Σ max |')
mdLines.push('| --- | ---: | ---: | ---: | ---: |')
for (const c of coverage) {
  const deficit = c.deficitToHigh > 0 ? `**${c.deficitToHigh}**` : '—'
  mdLines.push(`| ${c.code} | ${c.relevantDump} | ${c.relevantRef} | ${deficit} | ${c.globalMax} |`)
}
const most = coverage[coverage.length - 1]
const least = coverage[0]
mdLines.push('')
mdLines.push(
  `Перекос: ${most.code} (${most.relevantDump}) против ${least.code} (${least.relevantDump}) — ` +
    `разница в ${Math.round(most.relevantDump / Math.max(1, least.relevantDump))} раз.`
)
mdLines.push('')

mdLines.push('## 5. Асимметрия вариантов')
mdLines.push('')
mdLines.push(`### Нет дистракторов: все варианты скорят одну шкалу (${singleScaleAllOptions.length})`)
mdLines.push('')
mdLines.push('Любой ответ двигает шкалу — вопрос не различает выраженность, а измеряет согласие с сюжетом.')
mdLines.push('')
for (const q of singleScaleAllOptions) {
  mdLines.push(`- №${q.qnum} (${q.code}) — «${short(q.scenario, 60)}»`)
}
mdLines.push('')
mdLines.push(`### Слабый сигнал: ни одна шкала не получает ≥ 2 (${weakSignal.length})`)
mdLines.push('')
for (const q of weakSignal) {
  mdLines.push(`- №${q.qnum} — «${short(q.scenario, 60)}»`)
}
mdLines.push('')
mdLines.push(`### Варианты-вездеходы: один вариант скорит ≥ ${FAT_OPTION_SCALES} шкал (${fatOptions.length})`)
mdLines.push('')
for (const f of fatOptions) {
  mdLines.push(`- №${f.qnum}, вариант ${f.optionIndex + 1} (${f.scales} шкал) — «${short(f.scenario, 60)}»`)
}
mdLines.push('')
if (outOfRangeScores.length > 0) {
  mdLines.push(`### Баллы вне 1..3 (${outOfRangeScores.length})`)
  mdLines.push('')
  for (const o of outOfRangeScores) {
    mdLines.push(`- №${o.qnum}: ${o.code}=${o.score} — «${short(o.scenario, 60)}»`)
  }
  mdLines.push('')
}

mdLines.push('## 6. Полнота EN-локализации')
mdLines.push('')
mdLines.push(
  `Не переведено (EN пуст, содержит кириллицу или совпадает с RU): ` +
    `**${enScenarioUntranslated.length} сценариев из ${dump.length}** ` +
    `(${Math.round((enScenarioUntranslated.length / dump.length) * 100)}% банка), ` +
    `вопросов с непереведёнными вариантами — ${enOptionsUntranslated.length}.`
)
mdLines.push('')
if (enScenarioUntranslated.length > 0) {
  mdLines.push(`Диапазоны непереведённых сценариев: ${collapseRanges(enScenarioUntranslated)}.`)
  mdLines.push('')
  mdLines.push('EN-локаль при такой доле банка — не «отстающий перевод», а фактически русский тест')
  mdLines.push('с английским интерфейсом: стратифицированная выборка почти гарантированно приносит')
  mdLines.push('EN-пользователю русские вопросы. Решение о судьбе EN-банка (доперевод / сужение')
  mdLines.push('выборки до переведённых / честная пометка) — за пределами аудита, см. PLAN §5.10.')
}
mdLines.push('')

mdLines.push('## 7. Reverse-баланс')
mdLines.push('')
mdLines.push(
  `Метка \`_reverse\` существует только в батч-файлах — у ядра v1 (${v1Count - validitySortOrders.size} вопросов)`
)
mdLines.push('разметки нет вовсе, его reverse-баланс машинно не оценить (кандидат в задачи ревью).')
mdLines.push('')
mdLines.push('| Шкала | Батч | Вопросов | Reverse | Доля | Влит в банк |')
mdLines.push('| --- | --- | ---: | ---: | ---: | --- |')
for (const r of reverseStats) {
  const share = r.total > 0 ? `${Math.round((r.reverse / r.total) * 100)}%` : '—'
  mdLines.push(`| ${r.scale} | ${r.batch} | ${r.total} | ${r.reverse} | ${share} | ${r.merged ? 'да' : 'нет'} |`)
}
mdLines.push('')

mdLines.push('## Методика')
mdLines.push('')
mdLines.push('- Нормализация текста: нижний регистр, ё→е, пунктуация и лишние пробелы убраны.')
mdLines.push('- Почти-дубли формулировок: коэффициент Жаккара по множествам символьных триграмм')
mdLines.push(
  `  нормализованных сценариев. Пороги: ≥ ${NEAR_DUP_EXACTISH} — почти дословный, ≥ ${NEAR_DUP_STRONG} — в отчёт, ≥ ${NEAR_DUP_MIN} — в JSON.`
)
mdLines.push('- Сюжетные дубли: стемы (первые 4 символа) слов ≥ 3 букв вне стоп-листа; IDF-взвешенный')
mdLines.push('  containment = Σidf(общих) / min(Σidf сторон); в MD — при редком общем стеме')
mdLines.push(
  `  (df ≤ ${STORY_RARE_DF}) или containment ≥ ${STORY_DUP_SURE}. Калибровка — по контрольным парам из PLAN:`
)
mdLines.push('  «нашли кошелёк» №43↔№1176 (0.70), «кассир и сдача» №8↔№1986 (0.62) — обе ловятся.')
mdLines.push('- «Релевантный вопрос» шкалы — хотя бы один вариант даёт ей положительный балл')
mdLines.push('  (по дампу) либо `per_question_max > 0` (по справочнику, как в `scoring-core`).')
mdLines.push(`- Приоритет части B (решение из PLAN §5.10): сначала редкие шкалы, потом дубли, потом остальное.`)
mdLines.push('')

writeFileSync(OUT_MD, mdLines.join('\n'), 'utf-8')

const jsonReport = {
  generatedAt: new Date().toISOString(),
  bank: {
    total: dump.length,
    active: dump.filter((q) => q.active).length,
    validityChecks: [...validitySortOrders].map((s) => s + 1),
    v1Count,
  },
  thresholds: {
    nearDupMin: NEAR_DUP_MIN,
    nearDupStrong: NEAR_DUP_STRONG,
    nearDupExactish: NEAR_DUP_EXACTISH,
    storyDupMin: STORY_DUP_MIN,
    storyDupStrong: STORY_DUP_STRONG,
    fatOptionScales: FAT_OPTION_SCALES,
    confidenceHigh: CONFIDENCE_THRESHOLDS.high,
  },
  exactDuplicates,
  nearDuplicates,
  storyDuplicates,
  emptyScoring,
  emptyInRef,
  discrepancies: { known: knownFound, new: newDiscrepancies, globalMaxDrift },
  coverage,
  asymmetry: { singleScaleAllOptions, weakSignal, fatOptions, outOfRangeScores },
  en: {
    scenarioUntranslated: enScenarioUntranslated,
    optionsUntranslated: enOptionsUntranslated,
  },
  reverse: reverseStats,
}
writeFileSync(OUT_JSON, `${JSON.stringify(jsonReport, null, 2)}\n`, 'utf-8')

// ── Консольная сводка ──────────────────────────────────────────────────────

console.log(`Аудит банка: ${dump.length} вопросов (v1: ${v1Count}, батчи: ${dump.length - v1Count})`)
for (const [name, count] of summaryRows) {
  console.log(`  ${name}: ${count}`)
}
console.log(`\nОтчёты: ${OUT_MD}\n        ${OUT_JSON}`)
