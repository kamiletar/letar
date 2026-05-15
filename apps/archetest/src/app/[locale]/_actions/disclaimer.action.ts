'use server'

import { getDbUser, getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/** Проверить, принял ли пользователь дисклеймер */
export async function getDisclaimerStatusAction(): Promise<boolean> {
  const session = await getSession()
  if (!session?.user?.id) {
    return false
  }

  const db = getEnhancedPrisma(await getDbUser(session))
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAccepted: true },
  })

  return user?.disclaimerAccepted ?? false
}

/** Сохранить согласие с дисклеймером */
export async function acceptDisclaimerAction(): Promise<void> {
  const session = await getSession()
  if (!session?.user?.id) {
    return
  }

  const db = getEnhancedPrisma(await getDbUser(session))
  await db.user.update({
    where: { id: session.user.id },
    data: { disclaimerAccepted: true },
  })
}
