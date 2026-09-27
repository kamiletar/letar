import type { BetterAuthOptions } from 'better-auth'

/** Значение, которое возвращает `createLocalAccountIssuer('credential')` и пишет backfill-миграция. */
export const CREDENTIAL_ACCOUNT_ISSUER = 'local:credential'

type DatabaseHooks = NonNullable<BetterAuthOptions['databaseHooks']>
type AccountCreateBefore = NonNullable<NonNullable<NonNullable<DatabaseHooks['account']>['create']>['before']>

/**
 * Дополняет `databaseHooks`: `credential`-аккаунт без `issuer` получает `local:credential`.
 *
 * Зачем: `reset-password` у пользователя без credential-аккаунта создаёт его через
 * `createAccount` без `issuer` — строка с NULL, которую ловит алерт `account-issuer-null-check`;
 * разовый backfill такие строки не покрывает. Уже имеющийся `account.create.before` приложения
 * выполняется первым, наш — после него.
 *
 * См. .claude/docs/better-auth-1.7-account-issuer-field.md
 */
export function withCredentialAccountIssuer(databaseHooks?: BetterAuthOptions['databaseHooks']): DatabaseHooks {
  const existingBefore = databaseHooks?.account?.create?.before

  const before: AccountCreateBefore = async (account, context) => {
    const prepared = existingBefore ? await existingBefore(account, context) : undefined
    if (prepared === false) {
      return false
    }
    const current = (typeof prepared === 'object' && prepared ? { ...account, ...prepared.data } : account) as
      & typeof account
      & { issuer?: string | null }
    if (current.providerId === 'credential' && !current.issuer) {
      return { data: { ...current, issuer: CREDENTIAL_ACCOUNT_ISSUER } }
    }
    return prepared
  }

  return {
    ...databaseHooks,
    account: {
      ...databaseHooks?.account,
      create: { ...databaseHooks?.account?.create, before },
    },
  }
}
