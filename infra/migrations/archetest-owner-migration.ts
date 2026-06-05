/**
 * Этап 8.5 — Перенос данных владельца в archetest
 *
 * Переносит QuizLeaderboard/Sessions/Achievements со старых аккаунтов
 * на новый kami@letar.best, назначает роль ADMIN.
 *
 * ПЕРЕД запуском:
 *   1. Войти в archetest.letar.best через Ключницу → User(kami@letar.best) создан
 *   2. Сделать бэкап БД archetest
 *
 * Запуск на s2:
 *   cd /home/deploy/letar
 *   DATABASE_URL="postgresql://archetest:<POSTGRES_PASSWORD>@localhost:5441/archetest" \
 *     bun run infra/migrations/archetest-owner-migration.ts
 *
 * Dry-run:
 *   DRY_RUN=1 DATABASE_URL=... bun run infra/migrations/archetest-owner-migration.ts
 */

import { Pool } from 'pg'

const OLD_EMAILS = ['letarkami@gmail.com', 'kaspergreen@gmail.com']
const NEW_EMAIL = 'kami@letar.best'
const DRY_RUN = process.env.DRY_RUN === '1'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  console.log(`[archetest-migration] DRY_RUN=${DRY_RUN}`)

  try {
    const { rows: newUsers } = await client.query<{ id: string; email: string; roles: string[] }>(
      'SELECT id, email, roles FROM "User" WHERE email = $1',
      [NEW_EMAIL],
    )
    const newUser = newUsers[0]
    if (!newUser) {
      console.error(
        `❌ Пользователь ${NEW_EMAIL} не найден!\n`
          + `   Войди в archetest.letar.best через Ключницу и повтори.`,
      )
      process.exit(1)
    }
    console.log(`Новый: ${newUser.id} (${newUser.email}) roles=${JSON.stringify(newUser.roles)}`)

    const { rows: oldUsers } = await client.query<{
      id: string
      email: string
      roles: string[]
      leaderboard_id: string | null
      leaderboard_xp: number | null
      session_count: number
      achievement_count: number
    }>(
      `SELECT u.id, u.email, u.roles,
              l.id as leaderboard_id, l.xp as leaderboard_xp,
              (SELECT COUNT(*) FROM "QuizSession" s WHERE s."userId" = u.id)::int as session_count,
              (SELECT COUNT(*) FROM "UserQuizAchievement" a WHERE a."userId" = u.id)::int as achievement_count
       FROM "User" u
       LEFT JOIN "QuizLeaderboardEntry" l ON l."userId" = u.id
       WHERE u.email = ANY($1)`,
      [OLD_EMAILS],
    )

    if (oldUsers.length === 0 && newUser.roles.includes('ADMIN')) {
      console.log('✅ Старые пользователи не найдены, роль уже ADMIN — миграция выполнена.')
      process.exit(0)
    }

    for (const u of oldUsers) {
      console.log(
        `Старый: ${u.id} (${u.email}) roles=${JSON.stringify(u.roles)}\n`
          + `  LeaderboardEntry: ${u.leaderboard_id ? `xp=${u.leaderboard_xp}` : 'нет'}, `
          + `Sessions: ${u.session_count}, Achievements: ${u.achievement_count}`,
      )
    }

    if (DRY_RUN) {
      console.log('\n[dry-run] Изменения не применены.')
      process.exit(0)
    }

    await client.query('BEGIN')

    let needsAdmin = !newUser.roles.includes('ADMIN')

    for (const oldUser of oldUsers) {
      // Переносим QuizSession (QuizAnswer/QuizSkippedQuestion каскадом не нужно — там sessionId, не userId)
      const { rowCount: sessionsMoved } = await client.query(
        'UPDATE "QuizSession" SET "userId" = $1 WHERE "userId" = $2',
        [newUser.id, oldUser.id],
      )
      if (sessionsMoved) console.log(`  ✅ QuizSession перенесено: ${sessionsMoved}`)

      // Переносим UserQuizAchievement (проверяем дубли по achievementCode)
      const { rows: achievements } = await client.query<{ id: string; achievementCode: string }>(
        'SELECT id, "achievementCode" FROM "UserQuizAchievement" WHERE "userId" = $1',
        [oldUser.id],
      )
      for (const ach of achievements) {
        const { rows: exists } = await client.query(
          'SELECT id FROM "UserQuizAchievement" WHERE "userId" = $1 AND "achievementCode" = $2',
          [newUser.id, ach.achievementCode],
        )
        if (exists.length > 0) {
          await client.query('DELETE FROM "UserQuizAchievement" WHERE id = $1', [ach.id])
          console.log(`  ⚠️  Achievement ${ach.achievementCode}: дубль — удалён старый`)
        } else {
          await client.query(
            'UPDATE "UserQuizAchievement" SET "userId" = $1 WHERE id = $2',
            [newUser.id, ach.id],
          )
          console.log(`  ✅ Achievement перенесён: ${ach.achievementCode}`)
        }
      }

      // Объединяем QuizLeaderboardEntry — берём максимальные значения
      if (oldUser.leaderboard_id) {
        const { rows: newLb } = await client.query<{
          id: string
          sessions_count: number
          achievements_count: number
          total_answers: number
          xp: number
          rank_code: string
        }>(
          'SELECT id, "sessionsCount" as sessions_count, "achievementsCount" as achievements_count, "totalAnswers" as total_answers, xp, "rankCode" as rank_code FROM "QuizLeaderboardEntry" WHERE "userId" = $1',
          [newUser.id],
        )

        if (newLb.length > 0) {
          // Суммируем stats
          await client.query(
            `UPDATE "QuizLeaderboardEntry"
             SET "sessionsCount" = "sessionsCount" + (SELECT "sessionsCount" FROM "QuizLeaderboardEntry" WHERE id = $1),
                 "achievementsCount" = "achievementsCount" + (SELECT "achievementsCount" FROM "QuizLeaderboardEntry" WHERE id = $1),
                 "totalAnswers" = "totalAnswers" + (SELECT "totalAnswers" FROM "QuizLeaderboardEntry" WHERE id = $1),
                 xp = xp + (SELECT xp FROM "QuizLeaderboardEntry" WHERE id = $1)
             WHERE "userId" = $2`,
            [oldUser.leaderboard_id, newUser.id],
          )
          await client.query('DELETE FROM "QuizLeaderboardEntry" WHERE id = $1', [oldUser.leaderboard_id])
          console.log(`  ✅ LeaderboardEntry объединён (stats суммированы)`)
        } else {
          // У нового нет leaderboard — переносим
          await client.query(
            'UPDATE "QuizLeaderboardEntry" SET "userId" = $1 WHERE id = $2',
            [newUser.id, oldUser.leaderboard_id],
          )
          console.log(`  ✅ LeaderboardEntry перенесён`)
        }
      }

      if (oldUser.roles.includes('ADMIN')) needsAdmin = true

      await client.query('DELETE FROM "User" WHERE id = $1', [oldUser.id])
      console.log(`  ✅ Удалён: ${oldUser.email}`)
    }

    if (needsAdmin) {
      const newRoles = Array.from(new Set([...(newUser.roles || []), 'USER', 'ADMIN']))
      await client.query('UPDATE "User" SET roles = $1 WHERE id = $2', [newRoles, newUser.id])
      console.log(`  ✅ Роли обновлены → ${JSON.stringify(newRoles)}`)
    }

    await client.query('COMMIT')
    console.log(`\n✅ Готово. Аккаунт: ${newUser.id} (${NEW_EMAIL})`)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(() => pool.end())
