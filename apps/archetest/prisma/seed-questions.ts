/**
 * Seed-скрипт: загрузка вопросов квиза из JSON-дампа (ZenStack v3 ORM).
 *
 * Запуск:
 *   npx tsx --env-file=.env.local apps/archetest/prisma/seed-questions.ts          # безопасный append
 *   npx tsx --env-file=.env.local apps/archetest/prisma/seed-questions.ts --fresh  # полная пересборка
 *   npx tsx --env-file=.env.local apps/archetest/prisma/seed-questions.ts --sync-texts [--dry-run]
 * Или через Nx target: nx db:seed archetest [-- --sync-texts]
 *
 * Режимы:
 * - **append (по умолчанию)**: вставляет только вопросы, которых ещё нет в БД (по id).
 *   Существующие строки не трогаются → ссылки QuizAnswer/QuizSkippedQuestion сохраняются.
 *   Безопасен для ЖИВОГО прода (инкрементальное добавление батчей, напр. этап 5.5).
 * - **--fresh**: удаляет все вопросы и перезаливает дамп целиком. ⚠️ ТОЛЬКО для пустой
 *   или пересобираемой базы: QuizAnswer.questionId → ON DELETE SET NULL (обнулит связи
 *   ответов), QuizSkippedQuestion.questionId → ON DELETE RESTRICT (delete упадёт при
 *   наличии пропусков). На проде с данными пользователей НЕ использовать.
 * - **--sync-texts**: обновляет у существующих вопросов только формулировки (`scenario`,
 *   `scenarioEn`, тексты вариантов) из дампа — EN-перевод, вердикты ревьюера «Править».
 *   Если у вопроса в дампе изменились баллы, число или порядок вариантов, не пишет НИЧЕГО
 *   и завершается с ошибкой (баллы — решение с бампом QUESTION_BANK_VERSION, см.
 *   scripts/sync-texts-lib.ts). `--dry-run` — только отчёт. Безопасен для прода: id и связи
 *   ответов не меняются.
 */
import { parsePostgresUrl } from '@letar/pg-url'
import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { planTextSync } from '../scripts/sync-texts-lib'
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

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const db = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool(parsePostgresUrl(process.env.DATABASE_URL)),
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

async function syncTexts(questions: QuestionDump[], dryRun: boolean) {
  const dbRows = await db.quizQuestion.findMany({
    select: { id: true, scenario: true, scenarioEn: true, options: true },
  })
  const plan = planTextSync(dbRows, questions)

  console.log(
    `[--sync-texts] в дампе ${questions.length}: к обновлению ${plan.updates.length}, `
      + `без изменений ${plan.unchanged}, отказов ${plan.rejects.length}, нет в БД ${plan.missingInDb.length}`,
  )
  if (plan.missingInDb.length > 0) {
    console.log(`  нет в БД (это работа append-режима без флагов): ${plan.missingInDb.length}`)
  }
  if (plan.rejects.length > 0) {
    for (const reject of plan.rejects.slice(0, 20)) {
      console.error(`  ⛔ ${reject.id}: ${reject.reason}`)
    }
    throw new Error(`Синхронизация отменена целиком: ${plan.rejects.length} вопрос(ов) меняют не только тексты`)
  }
  if (dryRun || plan.updates.length === 0) {
    console.log(dryRun ? '[--dry-run] В БД ничего не записано.' : 'Тексты в БД актуальны.')
    return
  }

  await db.$transaction(async (tx) => {
    for (const update of plan.updates) {
      await tx.quizQuestion.update({ where: { id: update.id }, data: update.data })
    }
  })
  console.log(`Готово! Обновлены тексты ${plan.updates.length} вопросов (баллы не тронуты).`)
}

async function main() {
  const fresh = process.argv.includes('--fresh')
  const questions = questionsRaw as QuestionDump[]

  if (process.argv.includes('--sync-texts')) {
    if (fresh) { throw new Error('--sync-texts и --fresh несовместимы') }
    await syncTexts(questions, process.argv.includes('--dry-run'))
    return
  }

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
