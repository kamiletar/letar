import { prisma } from '@/lib/db'
import { ACHIEVEMENTS, ACHIEVEMENTS_MAP } from '../_data/achievements'
import { ALL_SCALE_CODES } from '../_data/personality-types'
import { getCumulativeConfidence } from './quiz.action'

/** Одна сессия для проверки достижений (моменты времени, mood, скоринг) */
interface AchievementSession {
  scores: string | null
  answeredCount: number
  completedAt: Date | null
  createdAt: Date
  moodValence: number | null
  moodEnergy: number | null
}

/** Контекст для проверки достижений */
interface AchievementContext {
  sessionsCount: number
  totalAnswers: number
  currentScores: Record<string, number>
  allSessions: AchievementSession[]
  existingAchievements: string[]
  completedAt: Date
  /** Достоверность по кумулятивному набору ВСЕХ отвеченных вопросов пользователя (5.9.4) */
  cumulativeConfidence: Record<string, string>
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Число различных пар (валентность, энергия) mood check-in среди сессий (5.9.4) */
function countDistinctMoods(sessions: AchievementSession[]): number {
  const set = new Set<string>()
  for (const s of sessions) {
    if (s.moodValence && s.moodEnergy) {
      set.add(`${s.moodValence}-${s.moodEnergy}`)
    }
  }
  return set.size
}

/** Есть ли пара последовательных сессий с разрывом ≥ minDays (5.9.4 RETURN_30) */
function hasGapOfAtLeast(sessionsAsc: AchievementSession[], minDays: number): boolean {
  for (let i = 1; i < sessionsAsc.length; i++) {
    const gapMs = sessionsAsc[i].createdAt.getTime() - sessionsAsc[i - 1].createdAt.getTime()
    if (gapMs >= minDays * DAY_MS) {
      return true
    }
  }
  return false
}

/** Есть ли окно из 4 сессий подряд, где каждый соседний разрыв ≥ minDays (5.9.4 SPACING_SERIES) */
function hasSpacingSeries(sessionsAsc: AchievementSession[], windowSize: number, minDays: number): boolean {
  for (let start = 0; start + windowSize <= sessionsAsc.length; start++) {
    let ok = true
    for (let i = start + 1; i < start + windowSize; i++) {
      const gapMs = sessionsAsc[i].createdAt.getTime() - sessionsAsc[i - 1].createdAt.getTime()
      if (gapMs < minDays * DAY_MS) {
        ok = false
        break
      }
    }
    if (ok) {
      return true
    }
  }
  return false
}

/** Только шкалы ядра 22: экспериментальные коды 5.5 в ачивках «тип личности» не участвуют */
function coreEntries(scores: Record<string, number>): [string, number][] {
  return Object.entries(scores).filter(([code]) => (ALL_SCALE_CODES as string[]).includes(code))
}

/** Получить топ-тип по нормализованным баллам */
function getTopType(scores: Record<string, number>): string | null {
  let maxCode: string | null = null
  let maxVal = -1
  for (const [code, val] of coreEntries(scores)) {
    if (val > maxVal) {
      maxVal = val
      maxCode = code
    }
  }
  return maxCode
}

/** Получить топ-3 типа */
function getTop3(scores: Record<string, number>): string[] {
  return coreEntries(scores)
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

    // Ритм (5.9.4)
    case 'THREE_MOODS':
      return countDistinctMoods(ctx.allSessions) >= 3
    case 'RETURN_30': {
      const sessionsAsc = [...ctx.allSessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      return hasGapOfAtLeast(sessionsAsc, 30)
    }
    case 'SPACING_SERIES': {
      const sessionsAsc = [...ctx.allSessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      return hasSpacingSeries(sessionsAsc, 4, 7)
    }
    case 'FULL_MAP':
      return ALL_SCALE_CODES.every((code) => ctx.cumulativeConfidence[code] === 'high')

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
    // Уникальные отвеченные вопросы по ВСЕМ сессиям — для кумулятивной достоверности (FULL_MAP)
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
  const cumulativeConfidence = await getCumulativeConfidence(answeredSortOrders)

  const ctx: AchievementContext = {
    sessionsCount: allSessions.length,
    totalAnswers,
    currentScores: newSession.scores,
    allSessions,
    existingAchievements: [...existingCodes],
    completedAt: newSession.completedAt,
    cumulativeConfidence,
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
