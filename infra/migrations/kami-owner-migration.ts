/**
 * Этап 8.5 — Перенос данных владельца в kami (выполнено 2026-06-05, скрипт оставлен как справка)
 *
 * Два старых личных аккаунта владельца → новый аккаунт Ключницы (kami@letar.best).
 * Конкретные адреса — в `.claude/private/COMPLIANCE.md`, здесь только через env (OLD_EMAILS).
 *
 * ПЕРЕД запуском:
 *   1. Войти в kami.letar.best через Ключницу → User(kami@letar.best) создан
 *   2. Сделать бэкап БД kami
 *
 * Запуск на s2:
 *   cd /home/deploy/letar
 *   DATABASE_URL="postgresql://lena_user:<pass>@localhost:5437/lena_kami" \
 *     OLD_EMAILS="old1@example.com,old2@example.com" \
 *     bun run infra/migrations/kami-owner-migration.ts
 *
 * Dry-run (без изменений):
 *   DRY_RUN=1 DATABASE_URL=... OLD_EMAILS=... bun run infra/migrations/kami-owner-migration.ts
 */

import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../../apps/kami/src/generated/schema'

if (!process.env.OLD_EMAILS) {
  console.error('❌ Missing required env: OLD_EMAILS (comma-separated)')
  process.exit(1)
}
const OLD_EMAILS = process.env.OLD_EMAILS.split(',').map((e) => e.trim())
const NEW_EMAIL = 'kami@letar.best'
const DRY_RUN = process.env.DRY_RUN === '1'

const prisma = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})

async function main() {
  console.log(`[kami-migration] DRY_RUN=${DRY_RUN}`)
  console.log(`[kami-migration] Старые аккаунты: ${OLD_EMAILS.join(', ')}`)
  console.log(`[kami-migration] Новый аккаунт:   ${NEW_EMAIL}\n`)

  const newUser = await prisma.user.findUnique({ where: { email: NEW_EMAIL } })
  if (!newUser) {
    console.error(`❌ Пользователь ${NEW_EMAIL} не найден!\n` + `   Войди в kami.letar.best через Ключницу и повтори.`)
    process.exit(1)
  }
  console.log(`Новый: ${newUser.id} (${newUser.email}) roles=${newUser.roles}`)

  const oldUsers = await prisma.user.findMany({
    where: { email: { in: OLD_EMAILS } },
    include: {
      uploadedAudio: { select: { id: true, title: true } },
      uploadedImages: { select: { id: true, path: true } },
      blogComments: { select: { id: true } },
      members: { select: { id: true, organizationId: true } },
    },
  })

  if (oldUsers.length === 0) {
    console.log('✅ Старые пользователи не найдены — миграция уже выполнена.')
    process.exit(0)
  }

  for (const u of oldUsers) {
    console.log(`\nСтарый: ${u.id} (${u.email}) roles=${u.roles}`)
    console.log(
      `  AudioFile: ${u.uploadedAudio.length}, Image: ${u.uploadedImages.length}, BlogComment: ${u.blogComments.length}, Member: ${u.members.length}`,
    )
    u.uploadedAudio.forEach((a) => console.log(`    🎵 ${a.title}`))
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Изменения не применены. Убери DRY_RUN=1 для реального запуска.')
    process.exit(0)
  }

  console.log('\nНачинаю миграцию...')

  await prisma.$transaction(async (tx) => {
    let needsAdmin = !newUser.roles.includes('ADMIN')

    for (const oldUser of oldUsers) {
      // Переносим AudioFile
      if (oldUser.uploadedAudio.length > 0) {
        const r = await tx.audioFile.updateMany({
          where: { uploadedById: oldUser.id },
          data: { uploadedById: newUser.id },
        })
        console.log(`  ✅ AudioFile перенесено: ${r.count} (из ${oldUser.email})`)
      }

      // Переносим Image
      if (oldUser.uploadedImages.length > 0) {
        const r = await tx.image.updateMany({
          where: { uploadedById: oldUser.id },
          data: { uploadedById: newUser.id },
        })
        console.log(`  ✅ Image перенесено: ${r.count} (из ${oldUser.email})`)
      }

      // Переносим BlogComment
      if (oldUser.blogComments.length > 0) {
        const r = await tx.blogComment.updateMany({
          where: { userId: oldUser.id },
          data: { userId: newUser.id },
        })
        console.log(`  ✅ BlogComment перенесено: ${r.count} (из ${oldUser.email})`)
      }

      // Переносим Member (проверяем дубли)
      for (const m of oldUser.members) {
        const exists = await tx.member.findUnique({
          where: { userId_organizationId: { userId: newUser.id, organizationId: m.organizationId } },
        })
        if (exists) {
          await tx.member.delete({ where: { id: m.id } })
          console.log(`  ⚠️  Member org=${m.organizationId}: дубль — удалён старый`)
        } else {
          await tx.member.update({ where: { id: m.id }, data: { userId: newUser.id } })
          console.log(`  ✅ Member перенесён: org=${m.organizationId}`)
        }
      }

      // Если старый был ADMIN — новый тоже должен быть
      if (oldUser.roles.includes('ADMIN')) {
        needsAdmin = true
      }

      // Удаляем старого пользователя (Account/Session каскадом)
      await tx.user.delete({ where: { id: oldUser.id } })
      console.log(`  ✅ Удалён: ${oldUser.email} (Account/Session каскадом)`)
    }

    // Назначаем ADMIN
    if (needsAdmin) {
      await tx.user.update({
        where: { id: newUser.id },
        data: { roles: ['USER', 'ADMIN'] },
      })
      console.log(`  ✅ Роли обновлены: {USER, ADMIN}`)
    }
  })

  console.log(`\n✅ Готово. Новый аккаунт: ${newUser.id} (${NEW_EMAIL})`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
