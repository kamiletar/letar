'use server'

import { getDbUser, getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Право на удаление данных (152-ФЗ ст. 14–17, этап 5.6.3).
 * Удаляет ВСЕ сессии квиза пользователя; ответы и пропуски удаляются каскадом
 * (onDelete: Cascade). Политика ZenStack `@@allow('delete', userId==auth().id)`
 * не даст затронуть чужие данные — deleteMany фильтруется по владельцу.
 */
export async function deleteMyQuizDataAction(): Promise<{ deleted?: number; error?: string }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'unauthorized' }
  }

  const db = getEnhancedPrisma(await getDbUser(session))

  try {
    const result = await db.quizSession.deleteMany({ where: { userId: session.user.id } })
    revalidatePath('/')
    revalidatePath('/settings')
    return { deleted: result.count }
  } catch {
    return { error: 'delete_failed' }
  }
}
