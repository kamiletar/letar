import { prisma } from '@/lib/db'
import { ACHIEVEMENTS, ACHIEVEMENTS_MAP } from '../_data/achievements'

/** Контекст для проверки достижений */
interface AchievementContext {
  sessionsCount: number
  totalAnswers: number
  currentScores: Record<string, number>
  allSessions: { scores: string | null; answeredCount: number; completedAt: Date | null; createdAt: Date }[]
  existingAchievements: string[]
  completedAt: Date
  sessionDurationMs: number
}

/** Получить топ-тип по нормализованным баллам */
function getTopType(scores: Record<string, number>): string | null {
  let maxCode: string | null = null
  let maxVal = -1
  for (const [code, val] of Object.entries(scores)) {
    if (val > maxVal) {
      maxVal = val
      maxCode = code
    }
  }
  return maxCode
}

/** Получить топ-3 типа */
function getTop3(scores: Record<string, number>): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => code)
}

/** Нормализовать raw scores из БД */
function normalizeScores(rawJson: string, answeredCount: number): Record<string, number> {
  const raw = JSON.parse(rawJson) as Record<string, number>
  const maxPossible = answeredCount * 3
  const result: Record<string, number> = {}
  for (const [code, value] of Object.entries(raw)) {
    result[code] = maxPossible > 0 ? Math.round((value / maxPossible) * 100) : 0
  }
  return result
}

/** Проверить выполнение конкретного достижения */
function checkAchievement(code: string, ctx: AchievementContext): boolean {
  switch (code) {
    // Прохождения
    case 'FIRST_QUIZ':
      return ctx.sessionsCount >= 1
    case 'SESSIONS_3':
      return ctx.sessionsCount >= 3
    case 'SESSIONS_5':
      return ctx.sessionsCount >= 5
    case 'SESSIONS_10':
      return ctx.sessionsCount >= 10
    case 'SESSIONS_25':
      return ctx.sessionsCount >= 25

    // Ответы
    case 'FULL_QUIZ':
      return ctx.allSessions.some((s) => s.answeredCount === 50)
    case 'SPEED_DEMON':
      return ctx.sessionDurationMs > 0 && ctx.sessionDurationMs < 5 * 60 * 1000
    case 'TOTAL_500':
      return ctx.totalAnswers >= 500
    case 'TOTAL_1000':
      return ctx.totalAnswers >= 1000

    // Результаты
    case 'DOMINANT_80':
      return Object.values(ctx.currentScores).some((v) => v >= 80)
    case 'BALANCED':
      return Object.values(ctx.currentScores).every((v) => v >= 20 && v <= 60)
    case 'TYPE_SHIFT': {
      // Нужно ≥2 сессии для сравнения
      const completedSessions = ctx.allSessions.filter((s) => s.scores && s.completedAt)
      if (completedSessions.length < 2) {
        return false
      }
      const currentTop = getTopType(ctx.currentScores)
      // Сравнить с предыдущими сессиями (кроме последней — она текущая)
      const prev = completedSessions[1]
      if (!prev.scores) {
        return false
      }
      const prevScores = normalizeScores(prev.scores, prev.answeredCount)
      const prevTop = getTopType(prevScores)
      return currentTop !== prevTop
    }
    case 'STABLE_PROFILE': {
      const completed = ctx.allSessions.filter((s) => s.scores && s.completedAt)
      if (completed.length < 3) {
        return false
      }
      // Проверяем что топ-3 совпадают в последних 3 сессиях
      const top3Sets = completed.slice(0, 3).map((s) => {
        const scores = normalizeScores(s.scores!, s.answeredCount)
        return getTop3(scores)
      })
      const reference = top3Sets[0].sort().join(',')
      return top3Sets.every((t) => t.sort().join(',') === reference)
    }

    // Особые
    case 'NIGHT_OWL': {
      const hour = ctx.completedAt.getHours()
      return hour >= 0 && hour < 5
    }
    case 'EARLY_BIRD': {
      const hour = ctx.completedAt.getHours()
      return hour >= 5 && hour < 7
    }

    default:
      return false
  }
}

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
    createdAt: Date
  }
): Promise<string[]> {
  // Загружаем контекст
  const [allSessions, existingAchievements] = await Promise.all([
    prisma.quizSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: { scores: true, answeredCount: true, completedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userQuizAchievement.findMany({
      where: { userId },
      select: { achievementCode: true },
    }),
  ])

  const existingCodes = new Set(existingAchievements.map((a) => a.achievementCode))
  const totalAnswers = allSessions.reduce((sum, s) => sum + s.answeredCount, 0)

  // Длительность текущей сессии
  const sessionDurationMs = newSession.completedAt.getTime() - newSession.createdAt.getTime()

  const ctx: AchievementContext = {
    sessionsCount: allSessions.length,
    totalAnswers,
    currentScores: newSession.scores,
    allSessions,
    existingAchievements: [...existingCodes],
    completedAt: newSession.completedAt,
    sessionDurationMs,
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
      )
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
