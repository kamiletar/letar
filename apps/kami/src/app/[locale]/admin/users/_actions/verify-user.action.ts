'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export type VerifyUserResult = {
  success: boolean
  error?: string
  emailVerified?: boolean
}

/**
 * Ручная верификация / снятие верификации email пользователя.
 * Только для ADMIN. Изменяет только поле emailVerified.
 */
export async function verifyUserAction(userId: string, verified: boolean): Promise<VerifyUserResult> {
  const session = await getSession()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: verified },
      select: { emailVerified: true },
    })

    revalidatePath('/admin/users')

    return { success: true, emailVerified: updated.emailVerified }
  } catch {
    return { success: false, error: 'Не удалось обновить верификацию' }
  }
}
