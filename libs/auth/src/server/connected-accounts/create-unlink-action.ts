import { revalidatePath } from 'next/cache'
import type { CreateUnlinkActionOptions, UnlinkAccountResult } from './types'

/**
 * Дефолтный логгер (no-op)
 */
const noopLogger = {
  debug: (() => undefined) as (...args: unknown[]) => void,
  info: (() => undefined) as (...args: unknown[]) => void,
  error: (() => undefined) as (...args: unknown[]) => void,
}

/**
 * Создаёт Server Action для отвязки OAuth аккаунта
 *
 * @example
 * ```typescript
 * // apps/my-app/src/app/settings/connected-accounts/_actions/unlink-account.action.ts
 * 'use server'
 *
 * import { createUnlinkAccountAction } from '@letar/auth/server'
 * import { getSession } from '@/lib/auth'
 * import { getEnhancedPrisma } from '@/lib/db'
 *
 * export const unlinkAccount = createUnlinkAccountAction({
 *   getSession,
 *   getDb: (user) => getEnhancedPrisma(user),
 *   revalidatePath: '/settings/connected-accounts',
 * })
 * ```
 */
export function createUnlinkAccountAction<TUser extends { id: string }>(
  options: CreateUnlinkActionOptions<TUser>
): (providerId: string) => Promise<UnlinkAccountResult> {
  const {
    getSession,
    getDb,
    revalidatePath: revalidatePathOption = '/settings/connected-accounts',
    logger = noopLogger,
  } = options

  return async function unlinkAccount(providerId: string): Promise<UnlinkAccountResult> {
    logger.debug('[UnlinkAccount] Provider:', providerId)

    // Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      logger.info('[UnlinkAccount] Unauthorized')
      return { success: false, error: 'Необходима авторизация' }
    }

    const db = getDb(session.user)

    try {
      // Получаем пользователя с аккаунтами
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: { accounts: true },
      })

      if (!user) {
        logger.info('[UnlinkAccount] User not found')
        return { success: false, error: 'Пользователь не найден' }
      }

      // Проверяем, есть ли у пользователя credential аккаунт с паролем
      const hasPassword = user.accounts.some((acc) => acc.providerId === 'credential' && acc.password)

      logger.debug('[UnlinkAccount] User found:', {
        id: user.id,
        accountsCount: user.accounts.length,
        hasPassword,
      })

      // Ищем аккаунт для отвязывания (Better Auth: providerId)
      const accountToUnlink = user.accounts.find((acc) => acc.providerId === providerId)

      if (!accountToUnlink) {
        logger.info('[UnlinkAccount] Account not found')
        return { success: false, error: 'Аккаунт не найден' }
      }

      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что не удаляем последний способ входа
      const otherAccountsCount = user.accounts.length - 1

      if (!hasPassword && otherAccountsCount === 0) {
        logger.info('[UnlinkAccount] Cannot unlink last login method')
        return {
          success: false,
          error: 'Нельзя отвязать последний способ входа. Сначала установите пароль или привяжите другой аккаунт.',
        }
      }

      // Удаляем аккаунт (Better Auth: providerId_accountId)
      await db.account.delete({
        where: {
          providerId_accountId: {
            providerId: accountToUnlink.providerId,
            accountId: accountToUnlink.accountId,
          },
        },
      })

      logger.info('[UnlinkAccount] Account unlinked successfully')

      // Обновляем страницу
      revalidatePath(revalidatePathOption)

      return { success: true }
    } catch (error) {
      logger.error('[UnlinkAccount] Error:', error)
      return { success: false, error: 'Не удалось отвязать аккаунт' }
    }
  }
}
