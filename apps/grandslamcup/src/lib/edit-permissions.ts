/**
 * Серверные проверки прав на редактирование сущностей.
 * Используются в публичных page.tsx для передачи canEdit в клиентские компоненты.
 */

import { prisma } from '@/lib/db'

/** Получить текущую сессию (мягко, без редиректа) */
async function getSessionSafe() {
  try {
    const { getSession } = await import('@/lib/auth')
    return await getSession()
  } catch {
    return null
  }
}

/**
 * Может ли текущий пользователь редактировать профиль поэта?
 * Да если: admin, сам поэт, или тренер/зам его команды.
 */
export async function canEditPlayer(playerUserId: string | null, teamSeasonIds: string[]): Promise<boolean> {
  const session = await getSessionSafe()
  if (!session?.user) {
    return false
  }

  const userId = session.user.id
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  })

  // Админ может всё
  if (dbUser?.roles?.includes('ADMIN')) {
    return true
  }

  // Сам поэт
  if (playerUserId && playerUserId === userId) {
    return true
  }

  // Тренер/зам команды этого поэта
  if (teamSeasonIds.length > 0) {
    const coachRecord = await prisma.playerTeamSeason.findFirst({
      where: {
        player: { userId },
        role: { in: ['COACH', 'ASSISTANT_COACH'] },
        teamSeasonId: { in: teamSeasonIds },
        leftAt: null,
      },
    })
    if (coachRecord) {
      return true
    }
  }

  return false
}

/**
 * Является ли текущий пользователь организатором (или админом) для данного города?
 */
export async function isOrganizerOfCity(cityId: string): Promise<boolean> {
  const session = await getSessionSafe()
  if (!session?.user) {
    return false
  }

  const userId = session.user.id
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  })

  if (dbUser?.roles?.includes('ADMIN')) {
    return true
  }

  const org = await prisma.cityOrganizer.findUnique({
    where: { userId_cityId: { userId, cityId } },
    select: { id: true },
  })

  return !!org
}

/**
 * Может ли текущий пользователь редактировать профиль команды?
 * Да если: admin или тренер/зам этой команды.
 */
export async function canEditTeam(teamSeasonIds: string[]): Promise<boolean> {
  const session = await getSessionSafe()
  if (!session?.user) {
    return false
  }

  const userId = session.user.id
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  })

  if (dbUser?.roles?.includes('ADMIN')) {
    return true
  }

  if (teamSeasonIds.length > 0) {
    const coachRecord = await prisma.playerTeamSeason.findFirst({
      where: {
        player: { userId },
        role: { in: ['COACH', 'ASSISTANT_COACH'] },
        teamSeasonId: { in: teamSeasonIds },
        leftAt: null,
      },
    })
    if (coachRecord) {
      return true
    }
  }

  return false
}
