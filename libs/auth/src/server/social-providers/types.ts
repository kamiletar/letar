import type { SocialProviderActionResult, SocialProviderInput } from '../../types'

/**
 * Минимальный интерфейс Prisma-клиента с таблицей socialProvider, нужный CRUD-фабрике.
 * Совместим и с raw Prisma-клиентом, и с ZenStack-enhanced (access policy применяется прозрачно).
 */
export interface PrismaWithSocialProviderCrud {
  socialProvider: {
    findUnique(args: {
      where: { id: string }
      select?: { clientSecret?: boolean }
    }): Promise<{ clientSecret: string } | null>
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>
    delete(args: { where: { id: string } }): Promise<unknown>
  }
}

export interface CreateSocialProviderActionsOptions<TUser> {
  /** Возвращает пользователя или null. Может бросить/сделать redirect самостоятельно (Next.js redirect). */
  requireAuth: () => Promise<TUser | null>
  /** DB-клиент (raw Prisma или ZenStack-enhanced) — приложение решает, что подставить */
  getDb: (user: TUser) => PrismaWithSocialProviderCrud
  /**
   * Ключ шифрования. Может вернуть null (см. `tryGetEncryptionKey`) — тогда действие вернёт
   * `keyMissingMessage` вместо падения (полезно для приложений, где строгий fail-fast недопустим).
   */
  encryptionKey: () => Buffer | null
  /** Базовый путь страницы списка для revalidatePath, например '/admin/social-providers' */
  basePath: string
  /** Сообщение при провале requireAuth (по умолчанию — общее) */
  unauthorizedMessage?: string
  /** Сообщение при encryptionKey() === null (по умолчанию — общее) */
  keyMissingMessage?: string
}

export interface SocialProviderActions {
  createSocialProvider(data: SocialProviderInput): Promise<SocialProviderActionResult>
  updateSocialProvider(id: string, data: SocialProviderInput): Promise<SocialProviderActionResult>
  deleteSocialProvider(id: string): Promise<SocialProviderActionResult>
  getSocialProviderSecretHint(id: string): Promise<string | null>
}
