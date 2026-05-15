'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Результаты опроса с агрегированными данными
 */
export interface SurveyResults {
  survey: {
    id: string
    title: string
    description: string | null
    status: string
    isAnonymous: boolean
    createdAt: Date
  }
  organization: {
    id: string
    name: string
    slug: string
  }
  responseCount: number
  questions: QuestionResults[]
}

export interface QuestionResults {
  id: string
  text: string
  type: 'TEXT' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RATING' | 'SCALE'
  options: string[]
  // Для TEXT — список ответов
  textAnswers?: string[]
  // Для SINGLE_CHOICE — распределение по вариантам
  choiceDistribution?: Record<string, number>
  // Для RATING/SCALE — средний балл и распределение
  averageRating?: number
  ratingDistribution?: Record<number, number>
  minValue?: number
  maxValue?: number
  minLabel?: string | null
  maxLabel?: string | null
}

/**
 * Получить результаты опроса для организации
 */
export async function getSurveyResultsAction(orgSlug: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { error: 'UNAUTHORIZED' }
    }

    // Находим организацию
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    })

    if (!org) {
      return { error: 'ORG_NOT_FOUND' }
    }

    // Проверяем, что пользователь является владельцем или админом
    const member = await prisma.member.findFirst({
      where: {
        organizationId: org.id,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] },
      },
    })

    if (!member) {
      return { error: 'ACCESS_DENIED' }
    }

    // Ищем активный или закрытый опрос с ответами
    const survey = await prisma.teamSurvey.findFirst({
      where: {
        organizationId: org.id,
        status: { in: ['active', 'closed'] },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answers: {
              include: {
                response: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          where: { status: 'completed' },
        },
      },
    })

    if (!survey) {
      return { error: 'NO_SURVEY' }
    }

    // Агрегируем результаты
    const questions: QuestionResults[] = survey.questions.map((q) => {
      // Только завершённые ответы
      const completedAnswers = q.answers.filter((a) => a.response.status === 'completed')

      const base: QuestionResults = {
        id: q.id,
        text: q.question,
        type: q.type as QuestionResults['type'],
        options: q.options ? (JSON.parse(q.options) as string[]) : [],
        minValue: q.minValue ?? undefined,
        maxValue: q.maxValue ?? undefined,
        minLabel: q.minLabel,
        maxLabel: q.maxLabel,
      }

      // Агрегация по типу вопроса
      switch (q.type) {
        case 'TEXT':
          base.textAnswers = completedAnswers
            .map((a) => a.textValue)
            .filter((v): v is string => v !== null && v.trim() !== '')
          break

        case 'SINGLE_CHOICE':
        case 'MULTI_CHOICE':
          base.choiceDistribution = {}
          for (const answer of completedAnswers) {
            if (answer.choiceValue) {
              const choice = answer.choiceValue
              base.choiceDistribution[choice] = (base.choiceDistribution[choice] || 0) + 1
            }
          }
          break

        case 'RATING':
        case 'SCALE': {
          base.ratingDistribution = {}
          let sum = 0
          let count = 0
          for (const answer of completedAnswers) {
            if (answer.ratingValue !== null) {
              const rating = answer.ratingValue
              base.ratingDistribution[rating] = (base.ratingDistribution[rating] || 0) + 1
              sum += rating
              count++
            }
          }
          base.averageRating = count > 0 ? sum / count : undefined
          break
        }
      }

      return base
    })

    const results: SurveyResults = {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        isAnonymous: survey.isAnonymous,
        createdAt: survey.createdAt,
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      responseCount: survey.responses.length,
      questions,
    }

    return { data: results }
  } catch (error) {
    console.error('[getSurveyResultsAction] Error:', error)
    return { error: 'UNKNOWN_ERROR' }
  }
}
