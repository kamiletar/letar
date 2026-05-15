'use server'

/**
 * Server Actions для управления NPS опросами.
 *
 * Функции:
 * - CRUD для опросов (Survey)
 * - Управление ответами (SurveyResponse)
 * - Расчёт NPS метрик
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

import { requireAuth } from '@/lib/action-helpers'
import { getAppUrl } from '@/lib/app-url'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { notifyUser } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'
import type { SurveyResponseStatus, SurveyTriggerType } from '@letar/driving-school-db/models'

const log = createLogger('Survey')

// === Типы ===

export interface SurveyWithStats {
  id: string
  name: string
  description: string | null
  triggerType: SurveyTriggerType
  delayDays: number
  expirationDays: number
  isActive: boolean
  createdAt: Date
  // Статистика
  totalResponses: number
  completedResponses: number
  npsScore: number | null
}

export interface SurveyResponseWithStudent {
  id: string
  token: string
  npsScore: number | null
  positiveComment: string | null
  improvementComment: string | null
  status: SurveyResponseStatus
  sentAt: Date | null
  completedAt: Date | null
  expiresAt: Date | null
  student: {
    id: string
    name: string
    image: string | null
    phone: string | null
  }
}

export interface NpsMetrics {
  /** NPS Score (-100 до +100) */
  score: number | null
  /** Количество Promoters (9-10) */
  promoters: number
  /** Количество Passives (7-8) */
  passives: number
  /** Количество Detractors (0-6) */
  detractors: number
  /** Всего ответов */
  totalResponses: number
  /** Процент заполнения */
  completionRate: number
}

// === Схемы валидации ===

const CreateSurveySchema = z
  .object({
    organizationId: z.string().cuid(),
    name: z.string().min(1, 'Введите название').max(100),
    description: z.string().max(500).optional(),
    triggerType: z.enum(['AFTER_COMPLETION', 'AFTER_FIRST_EXAM', 'AFTER_LICENSE', 'MANUAL']),
    delayDays: z.number().int().min(0).max(30).default(1),
    expirationDays: z.number().int().min(1).max(90).default(14),
    isActive: z.boolean().default(true),
  })
  .strip()

const UpdateSurveySchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    delayDays: z.number().int().min(0).max(30).optional(),
    expirationDays: z.number().int().min(1).max(90).optional(),
    isActive: z.boolean().optional(),
  })
  .strip()

export type CreateSurveyData = z.infer<typeof CreateSurveySchema>
export type UpdateSurveyData = z.infer<typeof UpdateSurveySchema>

// === Результаты ===

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// === Queries ===

/**
 * Получить список опросов школы с статистикой.
 */
export async function getSurveysAction(organizationId: string): Promise<ActionResult<SurveyWithStats[]>> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const surveys = await db.survey.findMany({
      where: { organizationId },
      include: {
        responses: {
          select: {
            id: true,
            status: true,
            npsScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result: SurveyWithStats[] = surveys.map((survey) => {
      const completed = survey.responses.filter((r) => r.status === 'COMPLETED')
      const npsScores = completed.map((r) => r.npsScore).filter((s): s is number => s !== null)

      return {
        id: survey.id,
        name: survey.name,
        description: survey.description,
        triggerType: survey.triggerType,
        delayDays: survey.delayDays,
        expirationDays: survey.expirationDays,
        isActive: survey.isActive,
        createdAt: survey.createdAt,
        totalResponses: survey.responses.length,
        completedResponses: completed.length,
        npsScore: calculateNpsScore(npsScores),
      }
    })

    return { success: true, data: result }
  } catch (error) {
    log.error('Ошибка получения опросов:', error)
    return { success: false, error: 'Не удалось загрузить опросы' }
  }
}

/**
 * Получить ответы на опрос.
 */
export async function getSurveyResponsesAction(surveyId: string): Promise<ActionResult<SurveyResponseWithStudent[]>> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const responses = await db.surveyResponse.findMany({
      where: { surveyId },
      include: {
        progress: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result: SurveyResponseWithStudent[] = responses.map((r) => ({
      id: r.id,
      token: r.token,
      npsScore: r.npsScore,
      positiveComment: r.positiveComment,
      improvementComment: r.improvementComment,
      status: r.status,
      sentAt: r.sentAt,
      completedAt: r.completedAt,
      expiresAt: r.expiresAt,
      student: {
        id: r.progress.user.id,
        name: r.progress.user.name ?? 'Без имени',
        image: r.progress.user.image,
        phone: r.progress.user.phone,
      },
    }))

    return { success: true, data: result }
  } catch (error) {
    log.error('Ошибка получения ответов:', error)
    return { success: false, error: 'Не удалось загрузить ответы' }
  }
}

/**
 * Получить NPS метрики для школы.
 */
export async function getNpsMetricsAction(organizationId: string): Promise<ActionResult<NpsMetrics>> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    // Получаем все ответы с NPS для школы
    const responses = await db.surveyResponse.findMany({
      where: {
        survey: { organizationId },
      },
      select: {
        status: true,
        npsScore: true,
      },
    })

    const total = responses.length
    const completed = responses.filter((r) => r.status === 'COMPLETED')
    const npsScores = completed.map((r) => r.npsScore).filter((s): s is number => s !== null)

    // Категоризация по NPS
    const promoters = npsScores.filter((s) => s >= 9).length
    const passives = npsScores.filter((s) => s >= 7 && s <= 8).length
    const detractors = npsScores.filter((s) => s <= 6).length

    const metrics: NpsMetrics = {
      score: calculateNpsScore(npsScores),
      promoters,
      passives,
      detractors,
      totalResponses: total,
      completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    }

    return { success: true, data: metrics }
  } catch (error) {
    log.error('Ошибка получения NPS метрик:', error)
    return { success: false, error: 'Не удалось загрузить метрики' }
  }
}

// === Mutations ===

/**
 * Создать новый опрос.
 */
export async function createSurveyAction(data: CreateSurveyData): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateSurveySchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const survey = await db.survey.create({
      data: parsed.data,
    })

    revalidatePath(`/school/surveys/${data.organizationId}`)
    return { success: true, data: { id: survey.id } }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { success: false, error: 'Опрос с таким триггером уже существует' }
    }
    log.error('Ошибка создания опроса:', error)
    return { success: false, error: 'Не удалось создать опрос' }
  }
}

/**
 * Обновить опрос.
 */
export async function updateSurveyAction(data: UpdateSurveyData): Promise<ActionResult> {
  const parsed = UpdateSurveySchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { id, ...updateData } = parsed.data

    const survey = await db.survey.update({
      where: { id },
      data: updateData,
    })

    revalidatePath(`/school/surveys/${survey.organizationId}`)
    return { success: true, data: undefined }
  } catch (error) {
    log.error('Ошибка обновления опроса:', error)
    return { success: false, error: 'Не удалось обновить опрос' }
  }
}

/**
 * Удалить опрос.
 */
export async function deleteSurveyAction(id: string): Promise<ActionResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const survey = await db.survey.delete({
      where: { id },
    })

    revalidatePath(`/school/surveys/${survey.organizationId}`)
    return { success: true, data: undefined }
  } catch (error) {
    log.error('Ошибка удаления опроса:', error)
    return { success: false, error: 'Не удалось удалить опрос' }
  }
}

/**
 * Отправить опрос ученику вручную.
 */
export async function sendSurveyManuallyAction(
  surveyId: string,
  progressId: string
): Promise<ActionResult<{ token: string }>> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    // Проверяем опрос
    const survey = await db.survey.findUnique({
      where: { id: surveyId },
    })

    if (!survey) {
      return { success: false, error: 'Опрос не найден' }
    }

    // Проверяем, есть ли уже ответ
    const existingResponse = await db.surveyResponse.findFirst({
      where: { surveyId, progressId },
    })

    if (existingResponse) {
      return { success: false, error: 'Опрос уже отправлен этому ученику' }
    }

    // Создаём запись ответа
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + survey.expirationDays)

    const response = await db.surveyResponse.create({
      data: {
        surveyId,
        progressId,
        status: 'SENT',
        sentAt: new Date(),
        expiresAt,
      },
    })

    // Отправляем уведомление ученику (fire-and-forget)
    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { userId: true, user: { select: { name: true } } },
    })

    if (progress?.userId) {
      const orchestratorRepo = createOrchestratorRepository()
      const providers = createNotificationProviders()
      const appUrl = getAppUrl()

      notifyUser({
        userId: progress.userId,
        type: 'SURVEY_SENT',
        title: 'Вам назначен опрос',
        body: `Пожалуйста, пройдите опрос «${survey.name}»`,
        data: {
          surveyId,
          responseToken: response.token,
          actionUrl: `/surveys/respond/${response.token}`,
        },
        repo: orchestratorRepo,
        providers,
        appUrl,
      }).catch((error) => {
        log.error('Ошибка отправки уведомления об опросе:', error)
      })
    }

    return { success: true, data: { token: response.token } }
  } catch (error) {
    log.error('Ошибка отправки опроса:', error)
    return { success: false, error: 'Не удалось отправить опрос' }
  }
}

// === Публичные actions (для страницы заполнения) ===

/**
 * Получить опрос по токену (публичный доступ).
 */
export async function getSurveyByTokenAction(token: string): Promise<
  ActionResult<{
    surveyName: string
    surveyDescription: string | null
    studentName: string
    schoolName: string
    isExpired: boolean
    isCompleted: boolean
  }>
> {
  try {
    const response = await prisma.surveyResponse.findUnique({
      where: { token },
      include: {
        survey: {
          include: {
            organization: {
              select: { name: true },
            },
          },
        },
        progress: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    })

    if (!response) {
      return { success: false, error: 'Опрос не найден' }
    }

    const isExpired = response.expiresAt ? response.expiresAt < new Date() : false
    const isCompleted = response.status === 'COMPLETED'

    return {
      success: true,
      data: {
        surveyName: response.survey.name,
        surveyDescription: response.survey.description,
        studentName: response.progress.user.name ?? 'Ученик',
        schoolName: response.survey.organization.name,
        isExpired,
        isCompleted,
      },
    }
  } catch (error) {
    log.error('Ошибка получения опроса:', error)
    return { success: false, error: 'Не удалось загрузить опрос' }
  }
}

const SubmitSurveySchema = z
  .object({
    token: z.string().cuid(),
    npsScore: z.number().int().min(0).max(10),
    positiveComment: z.string().max(1000).optional(),
    improvementComment: z.string().max(1000).optional(),
  })
  .strip()

/**
 * Заполнить опрос (публичный доступ).
 */
export async function submitSurveyAction(data: z.infer<typeof SubmitSurveySchema>): Promise<ActionResult> {
  const parsed = SubmitSurveySchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  try {
    const { token, npsScore, positiveComment, improvementComment } = parsed.data

    const response = await prisma.surveyResponse.findUnique({
      where: { token },
    })

    if (!response) {
      return { success: false, error: 'Опрос не найден' }
    }

    if (response.status === 'COMPLETED') {
      return { success: false, error: 'Опрос уже заполнен' }
    }

    if (response.expiresAt && response.expiresAt < new Date()) {
      return { success: false, error: 'Срок действия опроса истёк' }
    }

    await prisma.surveyResponse.update({
      where: { token },
      data: {
        npsScore,
        positiveComment: positiveComment || null,
        improvementComment: improvementComment || null,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    return { success: true, data: undefined }
  } catch (error) {
    log.error('Ошибка заполнения опроса:', error)
    return { success: false, error: 'Не удалось сохранить ответ' }
  }
}

// === Утилиты ===

/**
 * Вычислить NPS Score.
 *
 * NPS = % Promoters (9-10) - % Detractors (0-6)
 * Результат от -100 до +100
 */
function calculateNpsScore(scores: number[]): number | null {
  if (scores.length === 0) {
    return null
  }

  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length

  const promoterPercent = (promoters / scores.length) * 100
  const detractorPercent = (detractors / scores.length) * 100

  return Math.round(promoterPercent - detractorPercent)
}
