/**
 * Seed-скрипт: загрузка вопросов квиза из JSON-дампа (ZenStack v3 ORM).
 *
 * Запуск:
 *   npx tsx --env-file=.env.local apps/archetest/prisma/seed-questions.ts          # безопасный append
 *   npx tsx --env-file=.env.local apps/archetest/prisma/seed-questions.ts --fresh  # полная пересборка
 * Или через Nx target: nx db:seed archetest
 *
 * Режимы:
 * - **append (по умолчанию)**: вставляет только вопросы, которых ещё нет в БД (по id).
 *   Существующие строки не трогаются → ссылки QuizAnswer/QuizSkippedQuestion сохраняются.
 *   Безопасен для ЖИВОГО прода (инкрементальное добавление батчей, напр. этап 5.5).
 * - **--fresh**: удаляет все вопросы и перезаливает дамп целиком. ⚠️ ТОЛЬКО для пустой
 *   или пересобираемой базы: QuizAnswer.questionId → ON DELETE SET NULL (обнулит связи
 *   ответов), QuizSkippedQuestion.questionId → ON DELETE RESTRICT (delete упадёт при
 *   наличии пропусков). На проде с данными пользователей НЕ использовать.
 */
import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../src/generated/schema'
import questionsRaw from './questions-dump.json'

interface QuestionDump {
  id: string
  scenario: string
  scenarioEn: string
  options: string
  active: boolean
  sortOrder: number
  createdAt: string
}

const db = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }) as never,
})

const BATCH_SIZE = 100

/** Вставить записи батчами по 100 */
async function insertBatched(records: QuestionDump[]) {
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    await db.quizQuestion.createMany({
      data: batch.map((q) => ({
        id: q.id,
        scenario: q.scenario,
        scenarioEn: q.scenarioEn,
        options: q.options,
        active: q.active,
        sortOrder: q.sortOrder,
        createdAt: new Date(q.createdAt),
      })),
    })
    inserted += batch.length
    if (inserted % 500 === 0 || inserted === records.length) {
      console.log(`  ${inserted}/${records.length}`)
    }
  }
  return inserted
}

async function main() {
  const fresh = process.argv.includes('--fresh')
  const questions = questionsRaw as QuestionDump[]

  if (fresh) {
    // ⚠️ Пересборка: удаляет всё и заливает дамп целиком. Только пустая/пересобираемая база.
    console.log(`[--fresh] Полная пересборка: ${questions.length} вопросов`)
    const deleted = await db.quizQuestion.deleteMany()
    if (deleted.count > 0) {
      console.log(`Удалено ${deleted.count} старых вопросов`)
    }
    const inserted = await insertBatched(questions)
    console.log(`Готово! Загружено ${inserted} вопросов.`)
    return
  }

  // Безопасный append: вставляем только отсутствующие в БД (по id), не трогая существующие.
  const existing = await db.quizQuestion.findMany({ select: { id: true } })
  const existingIds = new Set(existing.map((q) => q.id))
  const toInsert = questions.filter((q) => !existingIds.has(q.id))

  console.log(`В дампе ${questions.length}, в БД уже ${existingIds.size}, к вставке ${toInsert.length}`)
  if (toInsert.length === 0) {
    console.log('Новых вопросов нет — БД актуальна.')
    return
  }

  const inserted = await insertBatched(toInsert)
  console.log(`Готово! Добавлено ${inserted} новых вопросов (существующие не тронуты).`)
}

main()
  .catch((e) => {
    console.error('Ошибка seed:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
