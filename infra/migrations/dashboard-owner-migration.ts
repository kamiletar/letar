/**
 * Этап 8.5 — Перенос данных владельца в dashboard
 *
 * Dashboard — служебное приложение без пользовательского контента.
 * Старые аккаунты удаляются, kami@letar.best получает роль ADMIN.
 *
 * ПЕРЕД запуском:
 *   1. Войти в dashboard.letar.best через Ключницу → User(kami@letar.best) создан
 *   2. Сделать бэкап БД dashboard
 *
 * Запуск на s2:
 *   cd /home/deploy/letar
 *   DATABASE_URL="postgresql://dashboard_user:<DB_PASSWORD>@localhost:5436/dashboard" \
 *     bun run infra/migrations/dashboard-owner-migration.ts
 *
 * Dry-run:
 *   DRY_RUN=1 DATABASE_URL=... OLD_EMAILS=... bun run infra/migrations/dashboard-owner-migration.ts
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
  console.log(`[dashboard-migration] DRY_RUN=${DRY_RUN}`)

  try {
    const { rows: newUsers } = await client.query<{ id: string; email: string; role: string }>(
      'SELECT id, email, role FROM "User" WHERE email = $1',
      [NEW_EMAIL],
    )
    const newUser = newUsers[0]
    if (!newUser) {
      console.error(
        `❌ Пользователь ${NEW_EMAIL} не найден!\n` + `   Войди в dashboard.letar.best через Ключницу и повтори.`,
      )
      process.exit(1)
    }
    console.log(`Новый: ${newUser.id} (${newUser.email}) role=${newUser.role}`)

    const { rows: oldUsers } = await client.query<{ id: string; email: string; role: string }>(
      'SELECT id, email, role FROM "User" WHERE email = ANY($1)',
      [OLD_EMAILS],
    )

    if (oldUsers.length === 0 && newUser.role === 'ADMIN') {
      console.log('✅ Старые пользователи не найдены, роль уже ADMIN — миграция выполнена.')
      process.exit(0)
    }

    for (const u of oldUsers) {
      console.log(`Старый: ${u.id} (${u.email}) role=${u.role}`)
    }

    if (DRY_RUN) {
      console.log('\n[dry-run] Изменения не применены.')
      process.exit(0)
    }

    await client.query('BEGIN')

    // Dashboard — служебное приложение, пользовательский контент не переносится.
    // Просто удаляем старые аккаунты (Account/Session каскадом через FK).
    for (const u of oldUsers) {
      await client.query('DELETE FROM "User" WHERE id = $1', [u.id])
      console.log(`  ✅ Удалён: ${u.email}`)
    }

    // Назначаем ADMIN
    if (newUser.role !== 'ADMIN') {
      await client.query('UPDATE "User" SET role = $1 WHERE id = $2', ['ADMIN', newUser.id])
      console.log(`  ✅ Роль обновлена → ADMIN`)
    } else {
      console.log(`  ℹ️  Роль уже ADMIN, пропускаем`)
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
