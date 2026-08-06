/**
 * Добавить 6 attention-check вопросов (валидность протокола) в банк.
 * Вопросы не имеют scoring (пустой объект) и не влияют на баллы шкал.
 * sortOrder фиксированы (2090..2095) и продублированы в _data/validity-checks.ts.
 *
 * Запуск: npx tsx apps/archetest/prisma/add-validity-questions.ts
 */
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DUMP = join(__dirname, 'questions-dump.json')
const MAXJSON = join(__dirname, '..', 'src', 'app', '[locale]', '_data', 'max-scores-per-question.json')

interface DumpQuestion {
  id: string
  scenario: string
  scenarioEn: string
  options: string
  active: boolean
  sortOrder: number
  createdAt: string
}

/** Опции без скоринга */
function opts(texts: Array<[string, string]>): string {
  return JSON.stringify(texts.map(([text, textEn]) => ({ text, textEn, scoring: {} })))
}

/** [сценарий ru, сценарий en, опции, correctOptionIndex — синхронизирован с validity-checks.ts] */
const CHECKS: Array<{ scenario: string; scenarioEn: string; options: string }> = [
  {
    scenario: 'Вопрос-проверка внимательности. Выберите третий вариант ответа.',
    scenarioEn: 'An attention check. Please select the third answer option.',
    options: opts([
      ['Я выбираю первый вариант', 'I choose the first option'],
      ['Я выбираю второй вариант', 'I choose the second option'],
      ['Я выбираю третий вариант', 'I choose the third option'],
      ['Я выбираю четвёртый вариант', 'I choose the fourth option'],
    ]),
  },
  {
    scenario: 'Для контроля качества данных выберите вариант со словом «якорь».',
    scenarioEn: 'For data quality control, select the option containing the word "anchor".',
    options: opts([
      ['Якорь', 'Anchor'],
      ['Парус', 'Sail'],
      ['Штурвал', 'Helm'],
      ['Компас', 'Compass'],
    ]),
  },
  {
    scenario: 'Если вы читаете этот вопрос, выберите последний вариант ответа.',
    scenarioEn: 'If you are reading this question, select the last answer option.',
    options: opts([
      ['Согласен', 'Agree'],
      ['Не согласен', 'Disagree'],
      ['Затрудняюсь ответить', 'Hard to say'],
      ['Я читаю вопросы внимательно', 'I read the questions carefully'],
    ]),
  },
  {
    scenario: 'Проверка внимательности: сколько будет два плюс два?',
    scenarioEn: 'Attention check: what is two plus two?',
    options: opts([
      ['Три', 'Three'],
      ['Четыре', 'Four'],
      ['Пять', 'Five'],
      ['Шесть', 'Six'],
    ]),
  },
  {
    scenario: 'Выберите вариант, противоположный слову «день».',
    scenarioEn: 'Select the option that is the opposite of the word "day".',
    options: opts([
      ['Утро', 'Morning'],
      ['Полдень', 'Noon'],
      ['Ночь', 'Night'],
      ['Вечер', 'Evening'],
    ]),
  },
  {
    scenario: 'Это служебный вопрос. Отметьте второй вариант, чтобы подтвердить внимательность.',
    scenarioEn: 'This is a service question. Mark the second option to confirm attentiveness.',
    options: opts([
      ['Первый', 'First'],
      ['Второй', 'Second'],
      ['Третий', 'Third'],
      ['Четвёртый', 'Fourth'],
    ]),
  },
]

const dump = JSON.parse(readFileSync(DUMP, 'utf-8')) as DumpQuestion[]
if (dump.some((q) => q.scenario === CHECKS[0].scenario)) {
  throw new Error('Чек-вопросы уже добавлены — повторный запуск не нужен')
}
if (dump.length !== 2090) {
  throw new Error(`Ожидалось 2090 вопросов перед добавлением, найдено ${dump.length}`)
}

const existingIds = new Set(dump.map((q) => q.id))
const createdAt = new Date().toISOString().replace('Z', '').slice(0, 23)
let sortOrder = dump.length

const newRecords: DumpQuestion[] = CHECKS.map((c) => {
  let id: string
  do {
    id = randomBytes(13).toString('hex').slice(0, 25)
  } while (existingIds.has(id))
  existingIds.add(id)
  return {
    id,
    scenario: c.scenario,
    scenarioEn: c.scenarioEn,
    options: c.options,
    active: true,
    sortOrder: sortOrder++,
    createdAt,
  }
})

interface MaxJson {
  metadata: { total_questions: number; parsed_questions: number; scales: string[]; description: string }
  global_max_scores: Record<string, number>
  per_question_max: Record<string, Record<string, number>>
}
const maxJson = JSON.parse(readFileSync(MAXJSON, 'utf-8')) as MaxJson
for (const r of newRecords) {
  maxJson.per_question_max[String(r.sortOrder + 1)] = {}
}
maxJson.metadata.total_questions = dump.length + newRecords.length
maxJson.metadata.parsed_questions = dump.length + newRecords.length

writeFileSync(DUMP, JSON.stringify([...dump, ...newRecords], null, 1), 'utf-8')
writeFileSync(MAXJSON, JSON.stringify(maxJson, null, 2), 'utf-8')
console.log(
  `Добавлено ${newRecords.length} чек-вопросов (sortOrder ${dump.length}..${sortOrder - 1}), банк: ${
    dump.length + newRecords.length
  }`,
)
