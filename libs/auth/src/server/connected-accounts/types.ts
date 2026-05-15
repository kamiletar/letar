import type { UnlinkAccountResult } from '../../types'

/**
 * Опции для createUnlinkAccountAction
 */
export interface CreateUnlinkActionOptions<TUser extends { id: string }> {
  /**
   * Функция получения текущей сессии пользователя
   * Должна возвращать null если пользователь не авторизован
   */
  getSession: () => Promise<{ user: TUser } | null>

  /**
   * Функция получения enhanced Prisma клиента
   * @param user Текущий пользователь для проверки доступа
   */
  getDb: (user: TUser) => {
    user: {
      findUnique: (args: { where: { id: string }; include: { accounts: true } }) => Promise<{
        id: string
        accounts: Array<{
          providerId: string
          accountId: string
          password?: string | null
        }>
      } | null>
    }
    account: {
      delete: (args: {
        where: {
          providerId_accountId: {
            providerId: string
            accountId: string
          }
        }
      }) => Promise<unknown>
    }
  }

  /**
   * Путь для revalidatePath после успешной операции
   * @default '/settings/connected-accounts'
   */
  revalidatePath?: string

  /**
   * Опциональный логгер
   */
  logger?: {
    debug: (message: string, ...args: unknown[]) => void
    info: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
  }
}

export type { UnlinkAccountResult }
