/**
 * Этап 8.5 — Перенос данных владельца в kami
 *
 * Переносит данные со старого локального аккаунта (letarkami@gmail.com)
 * на новый аккаунт Ключницы (kami@letar.best).
 *
 * ПЕРЕД запуском:
 *   1. Владелец должен войти в kami через Ключницу хотя бы раз
 *      → kami.letar.best → «Войти» → auth.letar.best → новый User создан
 *   2. Сделать бэкап БД kami
 *
 * Запуск на s2:
 *   cd /home/deploy/letar
 *   DATABASE_URL="postgresql://lena_user:<pass>@localhost:5437/lena_kami" \
 *     bun run infra/migrations/kami-owner-migration.ts
 *
 * Dry-run (без изменений):
 *   DRY_RUN=1 DATABASE_URL=... bun run infra/migrations/kami-owner-migration.ts
 */

import { PrismaClient } from '../../apps/kami/src/generated/prisma'

const OLD_EMAIL = 'letarkami@gmail.com'
const NEW_EMAIL = 'kami@letar.best'
const DRY_RUN = process.env.DRY_RUN === '1'

const prisma = new PrismaClient()

async function main() {
  console.log(`[kami-migration] DRY_RUN=${DRY_RUN}`)

  const oldUser = await prisma.user.findUnique({
    where: { email: OLD_EMAIL },
    include: {
      uploadedAudio: { select: { id: true, title: true } },
      uploadedImages: { select: { id: true, path: true } },
      blogComments: { select: { id: true } },
      members: { select: { id: true, organizationId: true } },
    },
  })

  if (!oldUser) {
    console.log(`[kami-migration] Старый пользователь ${OLD_EMAIL} не найден — уже мигрирован или не существует.`)
    process.exit(0)
  }

  const newUser = await prisma.user.findUnique({ where: { email: NEW_EMAIL } })

  if (!newUser) {
    console.error(
      `[kami-migration] ❌ Новый пользователь ${NEW_EMAIL} не найден!\n`
        + `  Войди в kami.letar.best через Ключницу и повтори.`,
    )
    process.exit(1)
  }

  console.log(`\nСтарый: ${oldUser.id} (${oldUser.email}) roles=${oldUser.roles}`)
  console.log(`Новый:  ${newUser.id} (${newUser.email}) roles=${newUser.roles}`)
  console.log('\nДанные для переноса:')
  console.log(`  AudioFile:    ${oldUser.uploadedAudio.length}`)
  console.log(`  Image:        ${oldUser.uploadedImages.length}`)
  console.log(`  BlogComment:  ${oldUser.blogComments.length}`)
  console.log(`  Member:       ${oldUser.members.length}`)
  oldUser.uploadedAudio.forEach((a) => console.log(`    🎵 ${a.title}`))

  if (DRY_RUN) {
    console.log('\n[dry-run] Изменения не применены. Убери DRY_RUN=1 для реального запуска.')
    process.exit(0)
  }

  console.log('\nНачинаю миграцию...')

  await prisma.$transaction(async (tx) => {
    // 1. Переносим AudioFile
    if (oldUser.uploadedAudio.length > 0) {
      const r = await tx.audioFile.updateMany({
        where: { uploadedById: oldUser.id },
        data: { uploadedById: newUser.id },
      })
      console.log(`  ✅ AudioFile перенесено: ${r.count}`)
    }

    // 2. Переносим Image
    if (oldUser.uploadedImages.length > 0) {
      const r = await tx.image.updateMany({
        where: { uploadedById: oldUser.id },
        data: { uploadedById: newUser.id },
      })
      console.log(`  ✅ Image перенесено: ${r.count}`)
    }

    // 3. Переносим BlogComment
    if (oldUser.blogComments.length > 0) {
      const r = await tx.blogComment.updateMany({
        where: { userId: oldUser.id },
        data: { userId: newUser.id },
      })
      console.log(`  ✅ BlogComment перенесено: ${r.count}`)
    }

    // 4. Переносим Member (если нет конфликта userId+organizationId)
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

    // 5. Назначаем ADMIN новому пользователю
    const needsAdmin = !newUser.roles.includes('ADMIN')
    if (needsAdmin) {
      await tx.user.update({
        where: { id: newUser.id },
        data: { roles: ['USER', 'ADMIN'] },
      })
      console.log(`  ✅ Роли обновлены: {USER, ADMIN}`)
    } else {
      console.log(`  ℹ️  Роль ADMIN уже есть`)
    }

    // 6. Удаляем старого пользователя (Account/Session каскадом)
    await tx.user.delete({ where: { id: oldUser.id } })
    console.log(`  ✅ Старый пользователь ${oldUser.email} удалён (Account/Session каскадом)`)
  })

  console.log('\n[kami-migration] ✅ Миграция завершена успешно.')
  console.log(`  Новый аккаунт: ${newUser.id} (${newUser.email})`)
}

main()
  .catch((e) => {
    console.error('[kami-migration] ❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
