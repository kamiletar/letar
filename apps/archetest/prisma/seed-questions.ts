/**
 * Seed-скрипт: загрузка вопросов квиза из JSON-дампа (ZenStack v3 ORM).
 *
 * Запуск: npx tsx --env-file=.env.local apps/archetest/prisma/seed-questions.ts
 * Или через Nx target: nx db:seed archetest
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

async function main() {
  const questions = questionsRaw as QuestionDump[]
  console.log(`Загрузка ${questions.length} вопросов...`)

  // Удаляем старые вопросы (если есть)
  const deleted = await db.quizQuestion.deleteMany()
  if (deleted.count > 0) {
    console.log(`Удалено ${deleted.count} старых вопросов`)
  }

  // Вставляем батчами по 100
  const BATCH_SIZE = 100
  let inserted = 0

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE)
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
    if (inserted % 500 === 0 || inserted === questions.length) {
      console.log(`  ${inserted}/${questions.length}`)
    }
  }

  console.log(`Готово! Загружено ${inserted} вопросов.`)
}

main()
  .catch((e) => {
    console.error('Ошибка seed:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
