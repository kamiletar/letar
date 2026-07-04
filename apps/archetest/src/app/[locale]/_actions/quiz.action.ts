'use server'

import { getDbUser, getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { z } from 'zod/v4'
import maxScoresData from '../_data/max-scores-per-question.json'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { ALL_SCALE_CODES } from '../_data/personality-types'
import { QUESTION_BANK_VERSION } from '../_data/question-bank-version'
import { isValidityQuestion, VALIDITY_CHECKS, VALIDITY_PER_SESSION } from '../_data/validity-checks'
import { fisherYatesShuffle, stratifiedSelect } from '../_lib/stratified-shuffle'
import { computeValidityFlags } from '../_lib/validity'
import { checkAndAwardAchievements } from './achievements.action'
import { recalcLeaderboardEntry } from './leaderboard.action'

/** Формат опции из БД */
interface QuizOptionData {
  text: string
  textEn: string
  scoring: Record<string, number>
}

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
  })
  .strip()

/** Уровень достоверности шкалы */
export type ScaleConfidence = 'insufficient' | 'low' | 'moderate' | 'high'

/** Уровень значимости шкалы */
export type ScaleLevel = 'minimal' | 'moderate' | 'significant' | 'high' | 'extreme' | 'insufficient_data'

/** Нормализованные результаты */
export interface QuizScores {
  raw: Record<PersonalityTypeCode, number>
  normalized: Record<PersonalityTypeCode, number>
  /** Достоверность каждой шкалы (зависит от числа пройденных релевантных вопросов) */
  confidence: Record<PersonalityTypeCode, ScaleConfidence>
  /** Уровень значимости каждой шкалы */
  levels: Record<PersonalityTypeCode, ScaleLevel>
  /** Ответы с sortOrder — для вычисления валидности протокола */
  answersWithSortOrder: { sortOrder: number; selectedOption: number }[]
}

/** Максимальные баллы по каждому вопросу (из JSON от психолога) */
const perQuestionMax = maxScoresData.per_question_max as Record<string, Record<string, number>>

/** Общее количество релевантных вопросов по каждой шкале */
const totalRelevantByScale: Record<string, number> = {}
for (const code of ALL_SCALE_CODES) {
  let count = 0
  for (const qMax of Object.values(perQuestionMax)) {
    if (qMax[code] && qMax[code] > 0) {
      count++
    }
  }
  totalRelevantByScale[code] = count
}

/** Определить уровень значимости */
function getScaleLevel(normalized: number): ScaleLevel {
  if (normalized < 20) {
    return 'minimal'
  }
  if (normalized < 40) {
    return 'moderate'
  }
  if (normalized < 60) {
    return 'significant'
  }
  if (normalized < 80) {
    return 'high'
  }
  return 'extreme'
}

/** Определить достоверность шкалы по числу пройденных релевантных вопросов */
function getScaleConfidence(scale: string, answeredSortOrders: number[]): ScaleConfidence {
  let relevant = 0
  for (const so of answeredSortOrders) {
    const qId = String(so + 1) // sortOrder 0-based → questionNumber 1-based
    if (perQuestionMax[qId]?.[scale] && perQuestionMax[qId][scale] > 0) {
      relevant++
    }
  }
  const total = totalRelevantByScale[scale] || 1
  const ratio = relevant / total
  if (ratio < 0.1) {
    return 'insufficient'
  }
  if (ratio < 0.3) {
    return 'low'
  }
  if (ratio < 0.6) {
    return 'moderate'
  }
  return 'high'
}

/** Результат сабмита */
export interface SubmitQuizResult {
  sessionId: string
  scores: QuizScores
  averagedScores: Record<PersonalityTypeCode, number> | null
  newAchievements: string[]
  rankInfo: { rankCode: string; xp: number } | null
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
 * Формула нормализации (TZ v2): normalized[S] = (raw[S] / actual_max[S]) × 100
 * где actual_max[S] = сумма макс. баллов по шкале S для каждого отвеченного вопроса.
 */
export async function calculateScores(
  answers: { questionId: string; selectedOption: number }[],
  db: ReturnType<typeof getEnhancedPrisma>
): Promise<QuizScores> {
  const raw: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    raw[code] = 0
  }

  // Загружаем вопросы из БД для авторитетного подсчёта
  const questionIds = answers.map((a) => a.questionId)
  const questions = await db.quizQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, sortOrder: true, options: true },
  })

  const questionsMap = new Map(
    questions.map((q) => [q.id, { options: JSON.parse(q.options) as QuizOptionData[], sortOrder: q.sortOrder }])
  )

  // Собираем sortOrder'ы отвеченных вопросов для расчёта достоверности и валидности
  const answeredSortOrders: number[] = []
  const answersWithSortOrder: { sortOrder: number; selectedOption: number }[] = []

  for (const answer of answers) {
    const qData = questionsMap.get(answer.questionId)
    if (!qData) {
      continue
    }

    answeredSortOrders.push(qData.sortOrder)
    answersWithSortOrder.push({ sortOrder: qData.sortOrder, selectedOption: answer.selectedOption })

    const option = qData.options[answer.selectedOption]
    if (!option) {
      continue
    }

    for (const [typeCode, score] of Object.entries(option.scoring)) {
      raw[typeCode] = (raw[typeCode] || 0) + score
    }
  }

  // Нормализация TZ v2: actual_max = сумма макс. баллов по пройденным вопросам
  const normalized: Record<string, number> = {}
  const confidence: Record<string, ScaleConfidence> = {}
  const levels: Record<string, ScaleLevel> = {}

  for (const code of ALL_SCALE_CODES) {
    // Считаем actual_max для этой шкалы
    let actualMax = 0
    for (const so of answeredSortOrders) {
      const qId = String(so + 1) // sortOrder 0-based → questionNumber 1-based
      const qMax = perQuestionMax[qId]
      if (qMax?.[code]) {
        actualMax += qMax[code]
      }
    }

    // Нормализация
    if (actualMax === 0) {
      normalized[code] = 0
      levels[code] = 'insufficient_data'
    } else {
      const norm = (raw[code] / actualMax) * 100
      normalized[code] = Math.round(norm * 10) / 10
      levels[code] = getScaleLevel(norm)
    }

    // Достоверность
    confidence[code] = getScaleConfidence(code, answeredSortOrders)
  }

  return {
    raw: raw as Record<PersonalityTypeCode, number>,
    normalized: normalized as Record<PersonalityTypeCode, number>,
    confidence: confidence as Record<PersonalityTypeCode, ScaleConfidence>,
    levels: levels as Record<PersonalityTypeCode, ScaleLevel>,
    answersWithSortOrder,
  }
}

/** Сохранить результаты квиза */
export async function submitQuizAction(
  input: z.input<typeof SubmitQuizSchema>
): Promise<{ data?: SubmitQuizResult; error?: string }> {
  const session = await getSession()
  if (!session) {
    return { error: 'unauthorized' }
  }

  const parsed = SubmitQuizSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'validation_error' }
  }

  const { seed, answers, skipped } = parsed.data
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

  const [averagedScores, newAchievements, rankInfo, progressData] = await Promise.all([
    getAveragedScores(db, session.user.id),
    validity.isValid
      ? checkAndAwardAchievements(session.user.id, {
          answeredCount: answers.length,
          scores: scores.normalized,
          completedAt,
          createdAt: quizSession.createdAt,
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
  ])

  return {
    data: {
      sessionId: quizSession.id,
      scores,
      averagedScores,
      newAchievements,
      rankInfo,
      progress: progressData,
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
  userId: string
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

    for (const code of ALL_SCALE_CODES) {
      // actual_max для этой сессии
      let actualMax = 0
      for (const q of answeredQuestions) {
        const qId = String(q.sortOrder + 1)
        if (perQuestionMax[qId]?.[code]) {
          actualMax += perQuestionMax[qId][code]
        }
      }

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
export async function getQuizHistoryAction(): Promise<{
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
} | null> {
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
