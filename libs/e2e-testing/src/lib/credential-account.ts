/**
 * Better Auth 1.7+ ищет credential-аккаунт строгим совпадением providerId+issuer+accountId,
 * где accountId — id пользователя (не email), issuer — буквальное 'local:credential'
 * (`createLocalAccountIssuer('credential')` из `@better-auth/core`). Без них `/sign-in/email`
 * не находит аккаунт даже при верном пароле. См.
 * `.claude/docs/better-auth-1.7-account-issuer-field.md`.
 *
 * Независимо переоткрыто и почти дословно продублировано в driving-school-e2e, dsperevod-e2e,
 * svoichuzhie-e2e (2026-08-28) — вынесено сюда.
 */

interface CredentialAccountDelegate {
  upsert(args: {
    where: { providerId_accountId: { providerId: 'credential'; accountId: string } }
    update: { password: string; issuer: 'local:credential' }
    create: {
      userId: string
      providerId: 'credential'
      accountId: string
      issuer: 'local:credential'
      password: string
    }
  }): Promise<unknown>
}

/**
 * Создаёт или обновляет Better Auth credential-`Account` для тестового пользователя.
 * `hashedPassword` — уже захешированный пароль (bcrypt/scrypt, в зависимости от того, чем
 * приложение хеширует пароли при регистрации) — эта функция сама ничего не хеширует.
 */
export async function upsertCredentialAccount(
  db: { account: CredentialAccountDelegate },
  params: { userId: string; hashedPassword: string },
): Promise<void> {
  const { userId, hashedPassword } = params
  await db.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: userId } },
    update: { password: hashedPassword, issuer: 'local:credential' },
    create: {
      userId,
      providerId: 'credential',
      accountId: userId,
      issuer: 'local:credential',
      password: hashedPassword,
    },
  })
}
