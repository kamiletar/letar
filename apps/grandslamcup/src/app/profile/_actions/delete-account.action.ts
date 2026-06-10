'use server'

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** Удаление аккаунта пользователя (152-ФЗ ст. 21 — право на стирание ПДн) */
export async function deleteAccountAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth()

  try {
    await prisma.user.delete({ where: { id: session.user.id } })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Не удалось удалить аккаунт. Попробуйте позже.' }
  }
}
