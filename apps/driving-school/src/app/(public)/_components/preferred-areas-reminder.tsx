import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PreferredAreasReminderUI } from './preferred-areas-reminder-ui'

/**
 * Напоминание ученику указать предпочитаемые районы
 * Показывается только авторизованным ученикам без заполненных районов
 */
export async function PreferredAreasReminder() {
  const session = await getSession()

  if (!session?.user?.id) {
    return null
  }

  // Проверяем наличие StudentProfile и заполненные районы
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { preferredAreas: true },
  })

  // Не ученик — не показываем
  if (!studentProfile) {
    return null
  }

  // Если районы уже заполнены — не показываем
  const areas = studentProfile.preferredAreas
  if (Array.isArray(areas) && areas.length > 0) {
    return null
  }

  return <PreferredAreasReminderUI />
}
