'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { createUnlinkAccountAction } from '@letar/auth/server'

/**
 * Server Action для отвязки OAuth аккаунта
 *
 * Используем createUnlinkAccountAction из @letar/auth для унификации логики:
 * - Проверка авторизации
 * - Проверка что не удаляем последний способ входа
 * - Удаление аккаунта из БД
 * - Ревалидация кэша
 */
export const unlinkAccount = createUnlinkAccountAction({
  getSession,
  getDb: (user) => getEnhancedPrisma(user),
  revalidatePath: '/profile/connected-accounts',
})
