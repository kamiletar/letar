/**
 * Этап 8.5 — Перенос данных владельца в animatrona-tracker
 *
 * Переносит Anime/UserLibrary/Distribution/PinJob со старых аккаунтов
 * на новый kami@letar.best, назначает роль ADMIN.
 *
 * ПЕРЕД запуском:
 *   1. Войти в animatrona.letar.best через Ключницу → User(kami@letar.best) создан
 *   2. Сделать бэкап БД animatrona-tracker
 *
 * Запуск на s2:
 *   cd /home/deploy/letar
 *   DATABASE_URL="postgresql://animatrona_user:<DB_PASSWORD>@localhost:5439/animatrona_tracker" \
 *     bun run infra/migrations/animatrona-tracker-owner-migration.ts
 *
 * Dry-run:
 *   DRY_RUN=1 DATABASE_URL=... OLD_EMAILS=... bun run infra/migrations/animatrona-tracker-owner-migration.ts
 *
 * OLD_EMAILS — через запятую, конкретные адреса в `.claude/private/COMPLIANCE.md`.
 */

import { Pool } from 'pg'

if (!process.env.OLD_EMAILS) {
  console.error('❌ Missing required env: OLD_EMAILS (comma-separated)')
  process.exit(1)
}
const OLD_EMAILS = process.env.OLD_EMAILS.split(',').map((e) => e.trim())
const NEW_EMAIL = 'kami@letar.best'
const DRY_RUN = process.env.DRY_RUN === '1'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  console.log(`[animatrona-tracker-migration] DRY_RUN=${DRY_RUN}`)

  try {
    const { rows: newUsers } = await client.query<{ id: string; email: string; role: string }>(
      'SELECT id, email, role FROM "User" WHERE email = $1',
      [NEW_EMAIL],
    )
    const newUser = newUsers[0]
    if (!newUser) {
      console.error(
        `❌ Пользователь ${NEW_EMAIL} не найден!\n` + `   Войди в animatrona.letar.best через Ключницу и повтори.`,
      )
      process.exit(1)
    }
    console.log(`Новый: ${newUser.id} (${newUser.email}) role=${newUser.role}`)

    const { rows: oldUsers } = await client.query<{
      id: string
      email: string
      role: string
      anime_count: number
      library_count: number
      distribution_count: number
      pinjob_count: number
      content_count: number
      apikey_count: number
    }>(
      `SELECT u.id, u.email, u.role,
              (SELECT COUNT(*) FROM "Anime" a WHERE a."uploadedById" = u.id)::int as anime_count,
              (SELECT COUNT(*) FROM "UserLibraryItem" l WHERE l."userId" = u.id)::int as library_count,
              (SELECT COUNT(*) FROM "Distribution" d WHERE d."userId" = u.id)::int as distribution_count,
              (SELECT COUNT(*) FROM "PinJob" j WHERE j."createdById" = u.id)::int as pinjob_count,
              (SELECT COUNT(*) FROM "Content" c WHERE c."userId" = u.id)::int as content_count,
              (SELECT COUNT(*) FROM "ApiKey" k WHERE k."userId" = u.id)::int as apikey_count
       FROM "User" u
       WHERE u.email = ANY($1)`,
      [OLD_EMAILS],
    )

    if (oldUsers.length === 0 && newUser.role === 'ADMIN') {
      console.log('✅ Старые пользователи не найдены, роль уже ADMIN — миграция выполнена.')
      process.exit(0)
    }

    for (const u of oldUsers) {
      console.log(
        `Старый: ${u.id} (${u.email}) role=${u.role}\n`
          + `  Anime: ${u.anime_count}, Library: ${u.library_count}, `
          + `Distribution: ${u.distribution_count}, PinJob: ${u.pinjob_count}, `
          + `Content: ${u.content_count}, ApiKey: ${u.apikey_count}`,
      )
    }

    if (DRY_RUN) {
      console.log('\n[dry-run] Изменения не применены.')
      process.exit(0)
    }

    await client.query('BEGIN')

    let needsAdmin = newUser.role !== 'ADMIN'

    for (const oldUser of oldUsers) {
      // Anime (uploadedById — RESTRICT: сначала переносим, потом удаляем user)
      if (oldUser.anime_count > 0) {
        const { rowCount } = await client.query('UPDATE "Anime" SET "uploadedById" = $1 WHERE "uploadedById" = $2', [
          newUser.id,
          oldUser.id,
        ])
        console.log(`  ✅ Anime перенесено: ${rowCount}`)
      }

      // UserLibraryItem (userId — CASCADE, но переносим данные)
      if (oldUser.library_count > 0) {
        // Перенос с учётом дублей по animeId
        const { rows: libraryItems } = await client.query<{ id: string; anime_id: string }>(
          'SELECT id, "animeId" as anime_id FROM "UserLibraryItem" WHERE "userId" = $1',
          [oldUser.id],
        )
        for (const item of libraryItems) {
          const { rows: exists } = await client.query(
            'SELECT id FROM "UserLibraryItem" WHERE "userId" = $1 AND "animeId" = $2',
            [newUser.id, item.anime_id],
          )
          if (exists.length > 0) {
            // Дубль — удаляем старый (UserWatchProgress каскадом)
            await client.query('DELETE FROM "UserLibraryItem" WHERE id = $1', [item.id])
            console.log(`  ⚠️  UserLibraryItem animeId=${item.anime_id}: дубль — удалён старый`)
          } else {
            await client.query('UPDATE "UserLibraryItem" SET "userId" = $1 WHERE id = $2', [newUser.id, item.id])
          }
        }
        console.log(`  ✅ UserLibraryItem обработано: ${libraryItems.length}`)
      }

      // Distribution (userId — RESTRICT)
      if (oldUser.distribution_count > 0) {
        const { rowCount } = await client.query('UPDATE "Distribution" SET "userId" = $1 WHERE "userId" = $2', [
          newUser.id,
          oldUser.id,
        ])
        console.log(`  ✅ Distribution перенесено: ${rowCount}`)
      }

      // PinJob (createdById — RESTRICT)
      if (oldUser.pinjob_count > 0) {
        const { rowCount } = await client.query('UPDATE "PinJob" SET "createdById" = $1 WHERE "createdById" = $2', [
          newUser.id,
          oldUser.id,
        ])
        console.log(`  ✅ PinJob перенесено: ${rowCount}`)
      }

      // Content (userId — SET NULL при delete, но переносим)
      if (oldUser.content_count > 0) {
        const { rowCount } = await client.query('UPDATE "Content" SET "userId" = $1 WHERE "userId" = $2', [
          newUser.id,
          oldUser.id,
        ])
        console.log(`  ✅ Content перенесено: ${rowCount}`)
      }

      // ApiKey (userId — CASCADE delete) — удалим: персональные ключи старого аккаунта не нужны
      if (oldUser.apikey_count > 0) {
        const { rowCount } = await client.query('DELETE FROM "ApiKey" WHERE "userId" = $1', [oldUser.id])
        console.log(`  ⚠️  ApiKey удалено (персональные): ${rowCount}`)
      }

      // ModerationLog (moderatorId — RESTRICT: нужно переносить перед удалением User)
      const { rowCount: modLogCount } = await client.query(
        'UPDATE "ModerationLog" SET "moderatorId" = $1 WHERE "moderatorId" = $2',
        [newUser.id, oldUser.id],
      )
      if (modLogCount) { console.log(`  ✅ ModerationLog перенесено: ${modLogCount}`) }

      // Rating и Report (userId — CASCADE delete) — удалятся вместе с User
      // Если нужно сохранить — добавить UPDATE здесь, но дубли по (contentId, userId) запрещены

      if (oldUser.role === 'ADMIN') { needsAdmin = true }

      await client.query('DELETE FROM "User" WHERE id = $1', [oldUser.id])
      console.log(`  ✅ Удалён: ${oldUser.email} (Rating/Report/Account/Session каскадом)`)
    }

    if (needsAdmin) {
      await client.query('UPDATE "User" SET role = $1 WHERE id = $2', ['ADMIN', newUser.id])
      console.log(`  ✅ Роль обновлена → ADMIN`)
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
