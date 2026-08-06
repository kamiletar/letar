'use server'

import { getDbUser, getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { z } from 'zod/v4'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { ALL_SCALE_CODES } from '../_data/personality-types'
import { QUESTION_BANK_VERSION } from '../_data/question-bank-version'
import { isValidityQuestion, VALIDITY_CHECKS, VALIDITY_PER_SESSION } from '../_data/validity-checks'
import type { AnsweredQuestionInput, QuizOptionData, QuizScores } from '../_lib/scoring-core'
import { computeActualMax, computeScoresCore, getScaleBankCoverage } from '../_lib/scoring-core'
import { fisherYatesShuffle, stratifiedSelect } from '../_lib/stratified-shuffle'
import { computeValidityFlags } from '../_lib/validity'
import { checkAndAwardAchievements } from './achievements.action'
import { recalcLeaderboardEntry } from './leaderboard.action'

// Ядро скоринга вынесено в _lib/scoring-core (этап 5.6, unit-тестируемо без next).
// Типы отсюда НЕ реэкспортируются: единственный источник — '../_lib/scoring-core'.
// Реэкспорт из 'use server'-модуля приглашал написать однажды value-импорт вместо
// type-импорта и утащить серверный код в клиентский бандл
// (см. .claude/docs/client-bundle-data-leaks.md).

/** Вопрос квиза для клиента */
export interface QuizQuestionDTO {
  id: string
  scenario: string
  scenarioEn: string
  options: QuizOptionData[]
}

/** Схема валидации ответа */
const AnswerSchema = z.object({
  questionId: z.string(),
  selectedOption: z.number().int().min(0).max(3),
})

/** Схема валидации данных квиза */
const SubmitQuizSchema = z
  .object({
    seed: z.number().int(),
    answers: z.array(AnswerSchema).min(1).max(100),
    /** ID пропущенных вопросов (видел и осознанно пропустил) */
    skipped: z.array(z.string()).optional().default([]),
    /** Mood check-in (этап 5.9.2): 1-3 по каждой оси циркумплекса, необязателен (можно пропустить) */
    moodValence: z.number().int().min(1).max(3).optional(),
    moodEnergy: z.number().int().min(1).max(3).optional(),
    /** Локаль прохождения (5.9.5): нормы ru/en считаются раздельно */
    locale: z.enum(['ru', 'en']).optional(),
  })
  .strip()

/**
 * Покрытие банка по всем шкалам ядра (0..1) для кумулятивного набора отвеченных
 * вопросов (этап 5.9.4, ачивка «Полная карта»). Async-обёртка над ядром scoring-core.
 *
 * Именно покрытие, а не достоверность: «полная карта» — это «прошёл всё, что есть
 * по каждой шкале», а достоверность отвечает на другой вопрос — «насколько точна
 * оценка» (и по редким шкалам банка её высокий уровень недостижим в принципе,
 * см. `confidenceFromCount`).
 */
export async function getCumulativeBankCoverage(answeredSortOrders: number[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    result[code] = getScaleBankCoverage(code, answeredSortOrders)
  }
  return result
}

/** Результат сабмита */
export interface SubmitQuizResult {
  sessionId: string
  scores: QuizScores
  averagedScores: Record<PersonalityTypeCode, number> | null
  newAchievements: string[]
  rankInfo: { rankCode: string; xp: number } | null
  /**
   * Вошла ли эта сессия в XP (5.9.3, гибрид): XP-гранула — сутки,
   * повторные порции дня XP не добавляют (но уточняют профиль)
   */
  xpCountedToday: boolean
  /** Прогресс после этой сессии */
  progress: {
    totalAnswered: number
    totalQuestions: number
    coveragePercent: number
    availableCount: number
  } | null
}

/**
 * Получить случайные вопросы из БД.
 * Исключает вопросы, на которые пользователь уже ответил или пропустил в прошлых сессиях.
 */
export async function getRandomQuestionsAction(count = 50): Promise<QuizQuestionDTO[]> {
  const db = getEnhancedPrisma()
  const session = await getSession()

  // Собираем ID вопросов, которые пользователь уже видел (ответил или пропустил)
  let excludeIds: string[] = []
  if (session?.user?.id) {
    const userDb = getEnhancedPrisma(await getDbUser(session))

    // Ответы из всех прошлых сессий
    const previousAnswers = await userDb.quizAnswer.findMany({
      where: { session: { userId: session.user.id } },
      select: { questionId: true },
    })
    const answeredIds = previousAnswers.map((a) => a.questionId).filter((id): id is string => id !== null)

    // Пропущенные из всех прошлых сессий (из таблицы QuizSkippedQuestion)
    const previousSkipped = await userDb.quizSkippedQuestion.findMany({
      where: { session: { userId: session.user.id } },
      select: { questionId: true },
    })
    const skippedIds = previousSkipped.map((s) => s.questionId)

    excludeIds = [...new Set([...answeredIds, ...skippedIds])]
  }

  const questions = await db.quizQuestion.findMany({
    where: {
      active: true,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: { id: true, scenario: true, scenarioEn: true, options: true, sortOrder: true },
  })

  // Attention-check вопросы не участвуют в стратификации: инжектятся отдельно,
  // повторный показ между сессиями допустим (исключения excludeIds игнорируются)
  const pool = questions.filter((q) => !isValidityQuestion(q.sortOrder))

  // Стратифицированная выборка: пропорциональное представительство всех шкал ядра
  const selected = stratifiedSelect(pool, Math.max(1, count - VALIDITY_PER_SESSION))

  const validityQuestions = await db.quizQuestion.findMany({
    where: { active: true, sortOrder: { in: VALIDITY_CHECKS.map((c) => c.sortOrder) } },
    select: { id: true, scenario: true, scenarioEn: true, options: true, sortOrder: true },
  })
  const injected = fisherYatesShuffle([...validityQuestions]).slice(0, VALIDITY_PER_SESSION)

  return fisherYatesShuffle([...selected, ...injected]).map((q) => ({
    id: q.id,
    scenario: q.scenario,
    scenarioEn: q.scenarioEn,
    options: JSON.parse(q.options) as QuizOptionData[],
  }))
}

/**
 * Посчитать баллы по ответам (серверная авторитетная версия).
 * Тонкая обёртка: загружает вопросы из БД и передаёт в чистое ядро
 * computeScoresCore (_lib/scoring-core) — формула нормализации и достоверность там.
 */
export async function calculateScores(
  answers: { questionId: string; selectedOption: number }[],
  db: ReturnType<typeof getEnhancedPrisma>,
): Promise<QuizScores> {
  // Загружаем вопросы из БД для авторитетного подсчёта
  const questionIds = answers.map((a) => a.questionId)
  const questions = await db.quizQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, sortOrder: true, options: true },
  })

  const questionsMap = new Map(
    questions.map((q) => [q.id, { options: JSON.parse(q.options) as QuizOptionData[], sortOrder: q.sortOrder }]),
  )

  // Ядру передаются только найденные в БД вопросы (неизвестные id игнорируются)
  const answered: AnsweredQuestionInput[] = []
  for (const answer of answers) {
    const qData = questionsMap.get(answer.questionId)
    if (!qData) {
      continue
    }
    answered.push({ sortOrder: qData.sortOrder, selectedOption: answer.selectedOption, options: qData.options })
  }

  return computeScoresCore(answered)
}

/** Сохранить результаты квиза */
export async function submitQuizAction(
  input: z.input<typeof SubmitQuizSchema>,
): Promise<{ data?: SubmitQuizResult; error?: string }> {
  const session = await getSession()
  if (!session) {
    return { error: 'unauthorized' }
  }

  const parsed = SubmitQuizSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'validation_error' }
  }

  const { seed, answers, skipped, moodValence, moodEnergy, locale } = parsed.data
  const db = getEnhancedPrisma(await getDbUser(session))
  const scores = await calculateScores(answers, db)

  // Валидность протокола: attention-check'и + монотонность паттерна.
  // Невалидная сессия сохраняется (raw неприкосновенен), но помечается
  const validity = computeValidityFlags(scores.answersWithSortOrder)

  const quizSession = await db.quizSession.create({
    data: {
      userId: session.user.id,
      seed,
      answeredCount: answers.length,
      skippedCount: skipped.length,
      scores: JSON.stringify(scores.raw),
      questionBankVersion: QUESTION_BANK_VERSION,
      isValid: validity.isValid,
      validityFlags: JSON.stringify(validity),
      moodValence,
      moodEnergy,
      locale,
      completedAt: new Date(),
      answers: {
        create: answers.map((a, i) => ({
          questionIndex: i, // legacy-поле, используем порядковый индекс
          selectedOption: a.selectedOption,
          questionId: a.questionId,
        })),
      },
      // Пропущенные вопросы — в отдельную таблицу
      ...(skipped.length > 0
        ? {
          skippedQuestions: {
            create: skipped.map((questionId) => ({ questionId })),
          },
        }
        : {}),
    },
  })

  // Параллельно: среднее, достижения, лидерборд, прогресс.
  // XP/ачивки/лидерборд — только за валидные протоколы (защита данных и норм)
  const completedAt = new Date()

  // 5.9.3 (гибрид): вошла ли сессия в XP — первая ли она валидная за текущие UTC-сутки
  const utcDayStart = new Date(
    Date.UTC(completedAt.getUTCFullYear(), completedAt.getUTCMonth(), completedAt.getUTCDate()),
  )

  const [averagedScores, newAchievements, rankInfo, progressData, earlierTodayCount] = await Promise.all([
    getAveragedScores(db, session.user.id),
    validity.isValid
      ? checkAndAwardAchievements(session.user.id, {
        answeredCount: answers.length,
        scores: scores.normalized,
        completedAt,
      })
      : Promise.resolve([]),
    validity.isValid ? recalcLeaderboardEntry(session.user.id) : Promise.resolve(null),
    // Считаем прогресс после сохранения
    (async () => {
      const [totalQuestions, _answeredCount, skippedCount] = await Promise.all([
        db.quizQuestion.count({ where: { active: true } }),
        db.quizAnswer.count({
          where: { session: { userId: session.user.id } },
        }),
        db.quizSkippedQuestion.count({
          where: { session: { userId: session.user.id } },
        }),
      ])
      // Для точности считаем уникальные ответы
      const uniqueAnswers = await db.quizAnswer.findMany({
        where: { session: { userId: session.user.id } },
        select: { questionId: true },
        distinct: ['questionId'],
      })
      const totalAnswered = uniqueAnswers.length
      const availableCount = Math.max(0, totalQuestions - totalAnswered - skippedCount)
      return {
        totalAnswered,
        totalQuestions,
        coveragePercent: totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 1000) / 10 : 0,
        availableCount,
      }
    })(),
    // Валидные сессии этих UTC-суток, созданные ДО текущей (сама сессия уже в БД)
    db.quizSession.count({
      where: {
        userId: session.user.id,
        completedAt: { not: null },
        isValid: true,
        createdAt: { gte: utcDayStart },
        id: { not: quizSession.id },
      },
    }),
  ])

  return {
    data: {
      sessionId: quizSession.id,
      scores,
      averagedScores,
      newAchievements,
      rankInfo,
      progress: progressData,
      xpCountedToday: validity.isValid && earlierTodayCount === 0,
    },
  }
}

/**
 * Получить среднее по всем сессиям пользователя.
 * Усреднение проходит по нормализованным баллам из каждой сессии.
 * TODO: В будущем перейти на пересчёт через actual_max из QuizAnswer + perQuestionMax
 */
async function getAveragedScores(
  db: ReturnType<typeof getEnhancedPrisma>,
  userId: string,
): Promise<Record<PersonalityTypeCode, number> | null> {
  // Усредняем только валидные сессии текущей версии банка: у разных версий разный
  // actual_max (несопоставимы), невалидные протоколы — шум (в истории остаются)
  const sessions = await db.quizSession.findMany({
    where: { userId, completedAt: { not: null }, questionBankVersion: QUESTION_BANK_VERSION, isValid: true },
    select: { id: true, scores: true, answeredCount: true },
    orderBy: { createdAt: 'desc' },
  })

  if (sessions.length <= 1) {
    return null
  }

  const totals: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    totals[code] = 0
  }

  let validSessions = 0
  for (const s of sessions) {
    if (!s.scores) {
      continue
    }

    const raw = JSON.parse(s.scores) as Record<string, number>

    // Загружаем отвеченные вопросы для правильной нормализации
    const sessionAnswers = await db.quizAnswer.findMany({
      where: { sessionId: s.id },
      select: { questionId: true },
    })
    const answeredQuestions = await db.quizQuestion.findMany({
      where: { id: { in: sessionAnswers.map((a) => a.questionId).filter((id): id is string => id !== null) } },
      select: { sortOrder: true },
    })

    validSessions++

    const answeredSortOrders = answeredQuestions.map((q) => q.sortOrder)

    for (const code of ALL_SCALE_CODES) {
      // actual_max для этой сессии
      const actualMax = computeActualMax(code, answeredSortOrders)
      const norm = actualMax > 0 ? ((raw[code] || 0) / actualMax) * 100 : 0
      totals[code] += Math.round(norm * 10) / 10
    }
  }

  if (validSessions === 0) {
    return null
  }

  const averaged: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    averaged[code] = Math.round((totals[code] / validSessions) * 10) / 10
  }

  return averaged as Record<PersonalityTypeCode, number>
}

/** Прогресс прохождения квиза пользователя */
export interface QuizProgress {
  /** Сколько вопросов ответил всего (все сессии) */
  totalAnswered: number
  /** Сколько вопросов пропустил всего */
  totalSkipped: number
  /** Сколько всего активных вопросов в БД */
  totalQuestions: number
  /** Процент покрытия */
  coveragePercent: number
  /** Сколько новых вопросов доступно */
  availableCount: number
  /** Число завершённых сессий */
  sessionsCount: number
  /** Накопительные баллы (по ВСЕМ ответам через все сессии) */
  cumulativeScores: QuizScores | null
  /** Усреднённые баллы (по сессиям) */
  averagedScores: Record<PersonalityTypeCode, number> | null
}

/**
 * Получить прогресс прохождения квиза.
 * Накопительные баллы считаются по ВСЕМ ответам из всех сессий (единый расчёт).
 */
export async function getQuizProgressAction(): Promise<QuizProgress | null> {
  const session = await getSession()
  if (!session?.user?.id) {
    return null
  }

  const db = getEnhancedPrisma(await getDbUser(session))

  // Параллельные запросы
  const [totalQuestions, answeredData, skippedData, sessionsCount] = await Promise.all([
    db.quizQuestion.count({ where: { active: true } }),
    db.quizAnswer.findMany({
      where: { session: { userId: session.user.id } },
      select: { questionId: true, selectedOption: true },
    }),
    db.quizSkippedQuestion.count({
      where: { session: { userId: session.user.id } },
    }),
    db.quizSession.count({
      where: { userId: session.user.id, completedAt: { not: null } },
    }),
  ])

  // Уникальные вопросы (пользователь мог ответить на один вопрос в разных сессиях — берём последний)
  const uniqueAnswered = new Map<string, number>()
  for (const a of answeredData) {
    if (a.questionId) {
      uniqueAnswered.set(a.questionId, a.selectedOption)
    }
  }

  const totalAnswered = uniqueAnswered.size
  const availableCount = totalQuestions - totalAnswered - skippedData
  const coveragePercent = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 1000) / 10 : 0

  // Накопительные баллы (по всем уникальным ответам)
  let cumulativeScores: QuizScores | null = null
  if (totalAnswered > 0) {
    const answersArray = Array.from(uniqueAnswered.entries()).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }))
    cumulativeScores = await calculateScores(answersArray, db)
  }

  // Усреднённые баллы (по сессиям)
  const averagedScores = sessionsCount > 1 ? await getAveragedScores(db, session.user.id) : null

  return {
    totalAnswered,
    totalSkipped: skippedData,
    totalQuestions,
    coveragePercent,
    availableCount: Math.max(0, availableCount),
    sessionsCount,
    cumulativeScores,
    averagedScores,
  }
}

/** Получить историю квизов пользователя */
export async function getQuizHistoryAction(): Promise<
  {
    sessions: Array<{
      id: string
      answeredCount: number
      scores: Record<PersonalityTypeCode, number> | null
      completedAt: Date | null
      createdAt: Date
      /** Версия банка вопросов — сессии разных версий несопоставимы на графиках */
      questionBankVersion: number
    }>
    averagedScores: Record<PersonalityTypeCode, number> | null
  } | null
> {
  const session = await getSession()
  if (!session) {
    return null
  }

  const db = getEnhancedPrisma(await getDbUser(session))
  const sessions = await db.quizSession.findMany({
    where: { userId: session.user.id, completedAt: { not: null } },
    select: {
      id: true,
      answeredCount: true,
      scores: true,
      completedAt: true,
      createdAt: true,
      questionBankVersion: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const parsed = sessions.map((s) => ({
    ...s,
    scores: s.scores ? (JSON.parse(s.scores) as Record<PersonalityTypeCode, number>) : null,
  }))

  const averagedScores = await getAveragedScores(db, session.user.id)

  return { sessions: parsed, averagedScores }
}
