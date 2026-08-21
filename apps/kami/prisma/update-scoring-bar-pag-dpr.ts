/**
 * Скрипт обновления scoring'а: добавление BAR/PAG/DPR к существующим
 * вопросам (1-1665) и посев 290 новых вопросов (1666-1955).
 *
 * Запуск:
 *   cd apps/kami
 *   DATABASE_URL="postgresql://..." bun run prisma/update-scoring-bar-pag-dpr.ts
 *
 * Или если .env настроен:
 *   cd apps/kami && bun run prisma/update-scoring-bar-pag-dpr.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from 'pg'

// Загружаем .env из директории приложения
const envPath = join(__dirname, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) { continue }
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) { continue }
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
} catch {
  // .env не найден — ожидаем DATABASE_URL из окружения
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан. Укажи через .env или переменную окружения.')
  process.exit(1)
}

// --- Типы ---

interface ScoringData {
  BAR: number
  PAG: number
  DPR: number
}

interface ExistingUpdates {
  [questionNumber: string]: {
    A: ScoringData
    B: ScoringData
    C: ScoringData
    D: ScoringData
  }
}

interface NewQuestionOption {
  text: string
  existingScoring: Record<string, number>
  BAR: number
  PAG: number
  DPR: number
}

interface NewQuestion {
  scenario: string
  options: {
    A: NewQuestionOption
    B: NewQuestionOption
    C: NewQuestionOption
    D: NewQuestionOption
  }
}

interface NewQuestions {
  [questionNumber: string]: NewQuestion
}

interface PsychologistScoring {
  existing_updates: ExistingUpdates
  new_questions: NewQuestions
}

interface QuizOption {
  text: string
  textEn: string
  scoring: Record<string, number>
}

// --- Загрузка данных ---

const scoringPath = join(__dirname, 'psychologist-scoring.json')
const scoringData: PsychologistScoring = JSON.parse(readFileSync(scoringPath, 'utf-8'))

// ⚠️ Пароль в DATABASE_URL генерируется через `openssl rand -base64 32` (см. security.md) —
// алфавит base64 содержит `/` и `+`. Необработанный `/` перед `@` ломает разбор строки через
// `new URL()` внутри pg-connection-string. Разбираем строку вручную и передаём поля отдельно.
function parsePostgresUrl(url: string) {
  const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([\s\S]+)@([^@/:]+):(\d+)\/([^?]+)/)
  if (!match) {
    throw new Error('DATABASE_URL: не удалось распарсить (ожидается postgresql://user:password@host:port/db)')
  }
  const [, user, password, host, port, database] = match
  return { user: decodeURIComponent(user), password: decodeURIComponent(password), host, port: Number(port), database }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const pool = new Pool(parsePostgresUrl(process.env.DATABASE_URL))

// --- Часть 1: Обновление существующих вопросов (1-1665) ---

async function updateExistingQuestions(): Promise<{ updated: number; skipped: number; errors: number }> {
  console.log('\n📝 Часть 1: Обновление существующих вопросов (добавление BAR/PAG/DPR)...\n')

  const updates = scoringData.existing_updates
  const questionNumbers = Object.keys(updates)
    .map(Number)
    .sort((a, b) => a - b)
  console.log(`  Всего вопросов для обновления: ${questionNumbers.length}`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const qNum of questionNumbers) {
    try {
      const sortOrder = qNum - 1 // sortOrder = номер вопроса - 1

      // Получаем текущий вопрос из БД
      const result = await pool.query('SELECT id, options FROM "QuizQuestion" WHERE "sortOrder" = $1', [sortOrder])

      if (result.rows.length === 0) {
        // Вопрос не найден — пропускаем
        skipped++
        continue
      }

      const row = result.rows[0]
      const options: QuizOption[] = typeof row.options === 'string' ? JSON.parse(row.options) : row.options

      const questionScoring = updates[String(qNum)]
      const optionKeys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

      let hasChanges = false

      for (let i = 0; i < 4; i++) {
        if (!options[i]) { continue }

        const key = optionKeys[i]
        const scores = questionScoring[key]

        // Добавляем только ненулевые значения
        if (scores.BAR > 0) {
          options[i].scoring.BAR = scores.BAR
          hasChanges = true
        }
        if (scores.PAG > 0) {
          options[i].scoring.PAG = scores.PAG
          hasChanges = true
        }
        if (scores.DPR > 0) {
          options[i].scoring.DPR = scores.DPR
          hasChanges = true
        }
      }

      if (hasChanges) {
        await pool.query('UPDATE "QuizQuestion" SET options = $1 WHERE id = $2', [JSON.stringify(options), row.id])
        updated++
      } else {
        skipped++
      }

      if (qNum % 100 === 0) {
        console.log(`  ... обработано ${qNum}/${questionNumbers.length} (обновлено: ${updated}, пропущено: ${skipped})`)
      }
    } catch (err) {
      errors++
      console.error(`  ⚠️ Ошибка при обновлении вопроса #${qNum}:`, (err as Error).message)
    }
  }

  console.log(`\n  ✅ Часть 1 завершена: обновлено=${updated}, пропущено=${skipped}, ошибок=${errors}`)
  return { updated, skipped, errors }
}

// --- Часть 2: Посев новых вопросов (1666-1955) ---

async function seedNewQuestions(): Promise<{ created: number; skipped: number; errors: number }> {
  console.log('\n📝 Часть 2: Посев новых вопросов (1666-1955)...\n')

  const newQuestions = scoringData.new_questions
  const questionNumbers = Object.keys(newQuestions)
    .map(Number)
    .sort((a, b) => a - b)
  console.log(`  Всего новых вопросов: ${questionNumbers.length}`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const qNum of questionNumbers) {
    try {
      const sortOrder = qNum - 1

      // Проверяем, нет ли уже вопроса с таким sortOrder
      const existing = await pool.query('SELECT id FROM "QuizQuestion" WHERE "sortOrder" = $1', [sortOrder])

      if (existing.rows.length > 0) {
        skipped++
        continue
      }

      const q = newQuestions[String(qNum)]
      const optionKeys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

      // Собираем массив опций
      const options: QuizOption[] = optionKeys.map((key) => {
        const opt = q.options[key]

        // Объединяем existingScoring с BAR/PAG/DPR (только ненулевые)
        const scoring: Record<string, number> = { ...opt.existingScoring }
        if (opt.BAR > 0) { scoring.BAR = opt.BAR }
        if (opt.PAG > 0) { scoring.PAG = opt.PAG }
        if (opt.DPR > 0) { scoring.DPR = opt.DPR }

        return {
          text: opt.text,
          textEn: '',
          scoring,
        }
      })

      // Генерируем cuid-подобный id (простая реализация для seed)
      const id = generateCuid()

      await pool.query(
        `INSERT INTO "QuizQuestion" (id, "sortOrder", scenario, "scenarioEn", options, active, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [id, sortOrder, q.scenario, '', JSON.stringify(options), true],
      )

      created++

      if (qNum % 100 === 0 || qNum === questionNumbers[questionNumbers.length - 1]) {
        console.log(
          `  ... обработано ${
            qNum - questionNumbers[0] + 1
          }/${questionNumbers.length} (создано: ${created}, пропущено: ${skipped})`,
        )
      }
    } catch (err) {
      errors++
      console.error(`  ⚠️ Ошибка при создании вопроса #${qNum}:`, (err as Error).message)
    }
  }

  console.log(`\n  ✅ Часть 2 завершена: создано=${created}, пропущено=${skipped}, ошибок=${errors}`)
  return { created, skipped, errors }
}

// --- Генерация cuid ---

let cuidCounter = 0

function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const counter = (cuidCounter++).toString(36).padStart(4, '0')
  const random = Math.random().toString(36).slice(2, 10)
  return `c${timestamp}${counter}${random}`
}

// --- Главная функция ---

async function main() {
  console.log('🚀 Обновление scoring BAR/PAG/DPR для Kami Quiz')
  console.log(`  База данных: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)

  // Проверяем подключение к БД
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM "QuizQuestion"')
    console.log(`  Вопросов в БД: ${res.rows[0].count}`)
  } catch (err) {
    console.error('❌ Не удалось подключиться к БД:', (err as Error).message)
    process.exit(1)
  }

  const part1 = await updateExistingQuestions()
  const part2 = await seedNewQuestions()

  // Финальная статистика
  console.log('\n' + '='.repeat(50))
  console.log('📊 Итоговая статистика:')
  console.log(`  Часть 1 (обновление): ${part1.updated} обновлено, ${part1.skipped} пропущено, ${part1.errors} ошибок`)
  console.log(`  Часть 2 (новые):      ${part2.created} создано, ${part2.skipped} пропущено, ${part2.errors} ошибок`)

  const totalAfter = await pool.query('SELECT COUNT(*) as count FROM "QuizQuestion"')
  console.log(`  Всего вопросов в БД:  ${totalAfter.rows[0].count}`)
  console.log('='.repeat(50))

  await pool.end()
  console.log('\n✅ Готово!')
}

main().catch((err) => {
  console.error('❌ Фатальная ошибка:', err)
  pool.end()
  process.exit(1)
})
