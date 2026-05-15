'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Server action для отвязки OAuth аккаунта
 */
export async function unlinkAccount(providerId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Не авторизован' }
  }

  // Получаем все аккаунты пользователя
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
  })

  // Проверяем, что не удаляем единственный метод входа
  const hasPassword = accounts.some((a) => a.providerId === 'credential' && a.password)
  const oauthCount = accounts.filter((a) => a.providerId !== 'credential').length

  if (!hasPassword && oauthCount <= 1) {
    return { success: false, error: 'Нельзя отвязать единственный способ входа' }
  }

  // Находим и удаляем аккаунт
  const account = accounts.find((a) => a.providerId === providerId)
  if (!account) {
    return { success: false, error: 'Аккаунт не найден' }
  }

  await prisma.account.delete({
    where: { providerId_accountId: { providerId: account.providerId, accountId: account.accountId } },
  })

  revalidatePath('/profile/connected-accounts')
  return { success: true }
}
