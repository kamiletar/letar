'use server'

import { prisma } from '@/lib/db'
import { ACHIEVEMENTS_MAP } from '../_data/achievements'
import { calculateXp, getRankByXp } from '../_data/ranks'

/** Запись лидерборда для клиента */
export interface LeaderboardEntry {
  userId: string
  name: string
  image: string | null
  sessionsCount: number
  achievementsCount: number
  totalAnswers: number
  xp: number
  rankCode: string
}

/** Получить лидерборд (публичный) */
export async function getLeaderboardAction(params?: { limit?: number }): Promise<LeaderboardEntry[]> {
  const limit = params?.limit ?? 50

  const entries = await prisma.quizLeaderboardEntry.findMany({
    take: limit,
    orderBy: { xp: 'desc' },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  return entries.map((e) => ({
    userId: e.userId,
    name: e.user.name ?? '',
    image: e.user.image,
    sessionsCount: e.sessionsCount,
    achievementsCount: e.achievementsCount,
    totalAnswers: e.totalAnswers,
    xp: e.xp,
    rankCode: e.rankCode,
  }))
}

/**
 * Пересчитать запись лидерборда для пользователя.
 * Вызывается из submitQuizAction (внутренняя функция).
 * Использует raw prisma для upsert (@@deny на enhanced).
 */
export async function recalcLeaderboardEntry(userId: string): Promise<{ rankCode: string; xp: number }> {
  const [sessions, achievements] = await Promise.all([
    prisma.quizSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: { answeredCount: true },
    }),
    prisma.userQuizAchievement.findMany({
      where: { userId },
      select: { achievementCode: true },
    }),
  ])

  const sessionsCount = sessions.length
  const totalAnswers = sessions.reduce((sum, s) => sum + s.answeredCount, 0)
  const achievementsCount = achievements.length
  const achievementXpSum = achievements.reduce((sum, a) => {
    const def = ACHIEVEMENTS_MAP.get(a.achievementCode)
    return sum + (def?.xpReward ?? 0)
  }, 0)

  const xp = calculateXp(sessionsCount, totalAnswers, achievementXpSum)
  const rank = getRankByXp(xp)

  await prisma.quizLeaderboardEntry.upsert({
    where: { userId },
    create: {
      userId,
      sessionsCount,
      achievementsCount,
      totalAnswers,
      xp,
      rankCode: rank.code,
    },
    update: {
      sessionsCount,
      achievementsCount,
      totalAnswers,
      xp,
      rankCode: rank.code,
    },
  })

  return { rankCode: rank.code, xp }
}
