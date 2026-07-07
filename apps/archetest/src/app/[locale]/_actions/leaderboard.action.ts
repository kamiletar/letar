'use server'

import { prisma } from '@/lib/db'
import { ACHIEVEMENTS_MAP } from '../_data/achievements'
import { calculateXp, countUniqueUtcDays, getRankByXp } from '../_data/ranks'

/**
 * Пересчитать кэш-запись (QuizLeaderboardEntry) для пользователя.
 * Соревновательный UI выпилен (этап 5.9.1), но кэш сохраняется в БД для Фазы 3.
 * Вызывается из submitQuizAction (внутренняя функция).
 * Использует raw prisma для upsert (@@deny на enhanced).
 */
export async function recalcLeaderboardEntry(userId: string): Promise<{ rankCode: string; xp: number }> {
  // XP только по валидным протоколам (5.1: невалидные исключены из XP;
  // ранее фильтра не было — невалидная сессия добавляла +100 при следующем пересчёте)
  const [sessions, achievements] = await Promise.all([
    prisma.quizSession.findMany({
      where: { userId, completedAt: { not: null }, isValid: true },
      select: { answeredCount: true, createdAt: true },
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

  // 5.9.3 (гибрид): XP-гранула — уникальный день, а не порция вопросов
  const uniqueDays = countUniqueUtcDays(sessions.map((s) => s.createdAt))
  const xp = calculateXp(uniqueDays, achievementXpSum)
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
