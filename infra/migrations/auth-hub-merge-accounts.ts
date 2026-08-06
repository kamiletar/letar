/**
 * Этап 8.5 — Merge двух УЖЕ СУЩЕСТВУЮЩИХ аккаунтов в auth-hub
 *
 * Кейс: человек случайно завёл два разных User в Ключнице (например, один раз зашёл через
 * email/password, другой раз — через Google OAuth с другим email). Self-service флоу
 * (`/profile/emails/`, модель UserEmail) такое не покрывает — там пользователь сам
 * подтверждает владение доп. email на СВОЁМ аккаунте, а не сливает два РАЗНЫХ существующих
 * аккаунта. Здесь canonical выбирается вручную оператором (владельцем).
 *
 * ⚠️⚠️⚠️ НЕОБРАТИМАЯ ОПЕРАЦИЯ. Duplicate-пользователь удаляется безвозвратно. ⚠️⚠️⚠️
 * ПЕРЕД запуском ОБЯЗАТЕЛЬНО сделать бэкап БД auth-hub (pg_dump).
 *
 * Что переносится с duplicate на canonical:
 *   - Account       — по одной записи (составной unique [providerId, accountId]:
 *                      совпадение только providerId — НЕ конфликт, разные внешние аккаунты
 *                      одного провайдера могут сосуществовать; полное совпадение providerId+
 *                      accountId — считается осиротевшим дублем у duplicate, удаляется)
 *   - Passkey, OauthApplication, OauthAccessToken, TelegramToken, ConsentLog
 *                   — простой перенос userId, unique-constraint на userId нет
 *   - OauthConsent  — нет DB-constraint на (userId, clientId), но возможен смысловой дубль
 *                      (оба давали consent одному клиенту) — при дубле запись duplicate
 *                      удаляется, у canonical остаётся своя/уже перенесённая
 *   - ProjectProfile — @@unique([userId, projectSlug]): при конфликте roles объединяются
 *                      (union), metadata canonical'а имеет приоритет (metadata duplicate
 *                      теряется, лог warning — сверить вручную при необходимости)
 *   - UserEmail (additionalEmails) — email глобально уникален, конфликта при переносе нет
 *   - email самого duplicate — сохраняется как доп. UserEmail у canonical (verified =
 *                      duplicate.emailVerified), по прецеденту setPrimaryEmail в
 *                      apps/auth-hub/src/app/profile/emails/_actions/emails.action.ts
 *   - roles         — union canonical.roles и duplicate.roles
 *
 * Что НЕ переносится:
 *   - Session — обе стороны (canonical и duplicate) принудительно разлогиниваются
 *     (deleteMany), а не переносятся. Причина: cookieCache Better Auth (5 мин TTL) может
 *     отдать устаревший email/userId в OIDC id_token ~10 downstream hub-client приложениям —
 *     безопаснее полный re-login, чем полагаться на протухание кэша.
 *
 * Затем duplicate User удаляется (`tx.user.delete`) — всё, что не перенесено к этому шагу,
 * будет снесено каскадом (onDelete: Cascade), это лишь подстраховка.
 *
 * Запуск на s2 (dry-run по умолчанию — БЕЗ явного DRY_RUN=0 ничего не меняется):
 *   cd /home/deploy/letar
 *   DATABASE_URL="postgresql://..." CANONICAL_EMAIL="keep@example.com" \
 *     DUPLICATE_EMAIL="dupe@example.com" \
 *     bun run infra/migrations/auth-hub-merge-accounts.ts
 *
 * Реальный запуск (применяет изменения):
 *   DATABASE_URL="..." CANONICAL_EMAIL="..." DUPLICATE_EMAIL="..." DRY_RUN=0 \
 *     bun run infra/migrations/auth-hub-merge-accounts.ts \
 *     | tee infra/migrations/logs/auth-hub-merge-$(date +%Y%m%d-%H%M%S).log
 *
 * Повторный запуск после успешного merge идемпотентен (duplicate не найден → early exit 0).
 */

import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../../apps/auth-hub/src/generated/schema'

const CANONICAL_EMAIL = process.env.CANONICAL_EMAIL
const DUPLICATE_EMAIL = process.env.DUPLICATE_EMAIL
// Инверсия дефолта относительно owner-миграций (DRY_RUN==='1' там): здесь без явного
// DRY_RUN=0 ничего не применяется — merge необратим и затрагивает потенциально живые сессии,
// цена ошибки выше, чем у owner-скриптов с предсказуемыми пустыми дублями.
const DRY_RUN = process.env.DRY_RUN !== '0'

const prisma = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})

async function main() {
  if (!CANONICAL_EMAIL || !DUPLICATE_EMAIL) {
    console.error('❌ Заданы не все переменные окружения: CANONICAL_EMAIL, DUPLICATE_EMAIL')
    process.exit(1)
  }

  console.log(`[auth-hub-merge] DRY_RUN=${DRY_RUN}`)
  console.log(`[auth-hub-merge] Canonical (остаётся): ${CANONICAL_EMAIL}`)
  console.log(`[auth-hub-merge] Duplicate (будет УДАЛЁН): ${DUPLICATE_EMAIL}\n`)

  const canonical = await prisma.user.findUnique({
    where: { email: CANONICAL_EMAIL },
    include: {
      accounts: true,
      projectProfiles: true,
      oauthConsents: true,
      additionalEmails: true,
    },
  })
  if (!canonical) {
    console.error(`❌ Canonical-пользователь ${CANONICAL_EMAIL} не найден.`)
    process.exit(1)
  }

  const duplicate = await prisma.user.findUnique({
    where: { email: DUPLICATE_EMAIL },
    include: {
      accounts: true,
      passkeys: true,
      oauthApplications: true,
      oauthAccessTokens: true,
      oauthConsents: true,
      projectProfiles: true,
      telegramTokens: true,
      consentLogs: true,
      additionalEmails: true,
    },
  })
  if (!duplicate) {
    console.log('✅ Duplicate-пользователь не найден — merge уже выполнен либо не требуется.')
    process.exit(0)
  }

  if (canonical.id === duplicate.id) {
    console.error('❌ CANONICAL_EMAIL и DUPLICATE_EMAIL указывают на один и тот же аккаунт.')
    process.exit(1)
  }

  console.log(`Canonical: ${canonical.id} (${canonical.email}) roles=${canonical.roles}`)
  console.log(`Duplicate: ${duplicate.id} (${duplicate.email}) roles=${duplicate.roles}`)
  console.log(
    `  Account: ${duplicate.accounts.length}, Passkey: ${duplicate.passkeys.length}, `
      + `OauthApplication: ${duplicate.oauthApplications.length}, OauthAccessToken: ${duplicate.oauthAccessTokens.length}, `
      + `OauthConsent: ${duplicate.oauthConsents.length}, ProjectProfile: ${duplicate.projectProfiles.length}, `
      + `TelegramToken: ${duplicate.telegramTokens.length}, ConsentLog: ${duplicate.consentLogs.length}, `
      + `UserEmail: ${duplicate.additionalEmails.length}`,
  )

  if (DRY_RUN) {
    console.log('\n[dry-run] Изменения не применены. Установи DRY_RUN=0 для реального запуска.')
    process.exit(0)
  }

  console.log('\n⚠️⚠️⚠️  НЕОБРАТИМАЯ ОПЕРАЦИЯ. Убедись, что бэкап БД auth-hub сделан.  ⚠️⚠️⚠️')
  console.log('Начинаю merge...\n')

  await prisma.$transaction(async (tx) => {
    // Account — по одной записи, из-за составного @@unique([providerId, accountId])
    for (const acc of duplicate.accounts) {
      const exactClash = canonical.accounts.find(
        (a) => a.providerId === acc.providerId && a.accountId === acc.accountId,
      )
      if (exactClash) {
        console.warn(
          `  ⚠️  Account providerId=${acc.providerId} accountId=${acc.accountId} уже есть у canonical — удаляю дубликат у duplicate`,
        )
        await tx.account.delete({ where: { id: acc.id } })
        continue
      }
      await tx.account.update({ where: { id: acc.id }, data: { userId: canonical.id } })
      console.log(`  ✅ Account перенесён: providerId=${acc.providerId} accountId=${acc.accountId}`)
    }

    // Passkey — unique-constraint на userId нет
    if (duplicate.passkeys.length > 0) {
      const r = await tx.passkey.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } })
      console.log(`  ✅ Passkey перенесено: ${r.count}`)
    }

    // OauthApplication — unique-constraint на userId нет
    if (duplicate.oauthApplications.length > 0) {
      const r = await tx.oauthApplication.updateMany({
        where: { userId: duplicate.id },
        data: { userId: canonical.id },
      })
      console.log(`  ✅ OauthApplication перенесено: ${r.count}`)
    }

    // OauthAccessToken — unique-constraint на userId нет
    if (duplicate.oauthAccessTokens.length > 0) {
      const r = await tx.oauthAccessToken.updateMany({
        where: { userId: duplicate.id },
        data: { userId: canonical.id },
      })
      console.log(`  ✅ OauthAccessToken перенесено: ${r.count}`)
    }

    // TelegramToken — unique-constraint на userId нет
    if (duplicate.telegramTokens.length > 0) {
      const r = await tx.telegramToken.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } })
      console.log(`  ✅ TelegramToken перенесено: ${r.count}`)
    }

    // ConsentLog — unique-constraint на userId нет, важно сохранить историю согласий (152-ФЗ)
    if (duplicate.consentLogs.length > 0) {
      const r = await tx.consentLog.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } })
      console.log(`  ✅ ConsentLog перенесено: ${r.count}`)
    }

    // OauthConsent — нет DB-constraint на (userId, clientId), но возможен смысловой дубль
    for (const c of duplicate.oauthConsents) {
      const existing = canonical.oauthConsents.find((cc) => cc.clientId === c.clientId)
      if (existing) {
        console.warn(`  ⚠️  OauthConsent clientId=${c.clientId}: дубль — удаляю у duplicate, у canonical уже есть`)
        await tx.oauthConsent.delete({ where: { id: c.id } })
      } else {
        await tx.oauthConsent.update({ where: { id: c.id }, data: { userId: canonical.id } })
        console.log(`  ✅ OauthConsent перенесён: clientId=${c.clientId}`)
      }
    }

    // ProjectProfile — @@unique([userId, projectSlug])
    for (const pp of duplicate.projectProfiles) {
      const existing = canonical.projectProfiles.find((cp) => cp.projectSlug === pp.projectSlug)
      if (existing) {
        const mergedRoles = Array.from(new Set([...existing.roles, ...pp.roles]))
        await tx.projectProfile.update({ where: { id: existing.id }, data: { roles: mergedRoles } })
        await tx.projectProfile.delete({ where: { id: pp.id } })
        console.warn(
          `  ⚠️  ProjectProfile projectSlug=${pp.projectSlug}: конфликт — roles объединены [${
            mergedRoles.join(
              ', ',
            )
          }], `
            + `metadata duplicate ОТБРОШЕНА (canonical сохранена), сверить вручную если нужно: ${
              JSON.stringify(
                pp.metadata,
              )
            }`,
        )
      } else {
        await tx.projectProfile.update({ where: { id: pp.id }, data: { userId: canonical.id } })
        console.log(`  ✅ ProjectProfile перенесён: projectSlug=${pp.projectSlug}`)
      }
    }

    // UserEmail (additionalEmails) — email глобально уникален, конфликта при переносе нет
    for (const ue of duplicate.additionalEmails) {
      await tx.userEmail.update({ where: { id: ue.id }, data: { userId: canonical.id } })
      console.log(`  ✅ UserEmail перенесён: ${ue.email}`)
    }

    // Email самого duplicate — сохранить как доп. подтверждённый адрес canonical
    const emailAlreadyStored = canonical.additionalEmails.some((ue) => ue.email === duplicate.email)
    if (emailAlreadyStored) {
      console.warn(`  ⚠️  duplicate.email=${duplicate.email} уже есть как UserEmail у canonical — пропускаю create`)
    } else {
      await tx.userEmail.create({
        data: { userId: canonical.id, email: duplicate.email, verified: duplicate.emailVerified },
      })
      console.log(
        `  ✅ Email duplicate сохранён как доп. адрес canonical: ${duplicate.email} (verified=${duplicate.emailVerified})`,
      )
    }

    // roles — union
    const mergedRoles = Array.from(new Set([...canonical.roles, ...duplicate.roles]))
    if (mergedRoles.length !== canonical.roles.length) {
      await tx.user.update({ where: { id: canonical.id }, data: { roles: mergedRoles } })
      console.log(`  ✅ Роли canonical обновлены: [${mergedRoles.join(', ')}]`)
    }

    // Session — НЕ переносятся, обе стороны принудительно разлогиниваются
    const sessionsDeleted = await tx.session.deleteMany({ where: { userId: { in: [canonical.id, duplicate.id] } } })
    console.log(`  ✅ Session инвалидированы (canonical + duplicate): ${sessionsDeleted.count}`)

    // Удаляем duplicate User — остатки (если что-то пропущено) снесутся каскадом
    await tx.user.delete({ where: { id: duplicate.id } })
    console.log(`  ✅ Duplicate удалён: ${duplicate.email}`)
  })

  console.log(`\n✅ Merge завершён. Canonical: ${canonical.id} (${CANONICAL_EMAIL})`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
