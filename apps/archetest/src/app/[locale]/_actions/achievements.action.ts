import { prisma } from '@/lib/db'
import { ACHIEVEMENTS, ACHIEVEMENTS_MAP } from '../_data/achievements'
import { type AchievementContext, checkAchievement } from '../_lib/achievement-rules'
import { getCumulativeBankCoverage } from './quiz.action'

/**
 * Проверить и присвоить достижения после завершения квиза.
 * Вызывается из submitQuizAction (внутренняя функция, не 'use server').
 * Использует raw prisma для создания (@@deny на enhanced).
 */
export async function checkAndAwardAchievements(
  userId: string,
  newSession: {
    answeredCount: number
    scores: Record<string, number>
    completedAt: Date
  },
): Promise<string[]> {
  // Загружаем контекст
  const [allSessions, existingAchievements, uniqueAnsweredQuestions] = await Promise.all([
    prisma.quizSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: {
        scores: true,
        answeredCount: true,
        completedAt: true,
        createdAt: true,
        moodValence: true,
        moodEnergy: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userQuizAchievement.findMany({
      where: { userId },
      select: { achievementCode: true },
    }),
    // Уникальные отвеченные вопросы по ВСЕМ сессиям — для кумулятивного покрытия (FULL_MAP)
    prisma.quizAnswer.findMany({
      where: { session: { userId } },
      select: { question: { select: { sortOrder: true } } },
      distinct: ['questionId'],
    }),
  ])

  const existingCodes = new Set(existingAchievements.map((a) => a.achievementCode))
  const totalAnswers = allSessions.reduce((sum, s) => sum + s.answeredCount, 0)
  const answeredSortOrders = uniqueAnsweredQuestions
    .map((a) => a.question?.sortOrder)
    .filter((so): so is number => so !== undefined && so !== null)
  const cumulativeCoverage = await getCumulativeBankCoverage(answeredSortOrders)

  const ctx: AchievementContext = {
    sessionsCount: allSessions.length,
    totalAnswers,
    currentScores: newSession.scores,
    allSessions,
    existingAchievements: [...existingCodes],
    completedAt: newSession.completedAt,
    cumulativeCoverage,
  }

  // Проверяем все ещё не разблокированные достижения
  const newAchievements: string[] = []
  for (const achievement of ACHIEVEMENTS) {
    if (existingCodes.has(achievement.code)) {
      continue
    }
    if (checkAchievement(achievement.code, ctx)) {
      newAchievements.push(achievement.code)
    }
  }

  // Записываем новые достижения через raw prisma
  if (newAchievements.length > 0) {
    await Promise.all(
      newAchievements.map((code) =>
        prisma.userQuizAchievement.create({
          data: { userId, achievementCode: code },
        })
      ),
    )
  }

  return newAchievements
}

/** Получить все достижения пользователя */
export async function getMyAchievementsAction(userId: string): Promise<{
  unlocked: { code: string; unlockedAt: Date }[]
  totalXp: number
}> {
  const achievements = await prisma.userQuizAchievement.findMany({
    where: { userId },
    select: { achievementCode: true, unlockedAt: true },
    orderBy: { unlockedAt: 'desc' },
  })

  const unlocked = achievements.map((a) => ({ code: a.achievementCode, unlockedAt: a.unlockedAt }))
  const totalXp = unlocked.reduce((sum, a) => {
    const def = ACHIEVEMENTS_MAP.get(a.code)
    return sum + (def?.xpReward ?? 0)
  }, 0)

  return { unlocked, totalXp }
}
