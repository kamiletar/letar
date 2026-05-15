'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

/**
 * Получить активный опрос для организации
 */
export async function getSurveyAction(orgSlug: string) {
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

    // Проверяем, что пользователь является членом организации
    const member = await prisma.member.findFirst({
      where: {
        organizationId: org.id,
        userId: session.user.id,
      },
    })

    if (!member) {
      return { error: 'NOT_A_MEMBER' }
    }

    // Ищем активный опрос (status = 'active')
    const survey = await prisma.teamSurvey.findFirst({
      where: {
        organizationId: org.id,
        status: 'active',
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!survey) {
      return { error: 'NO_ACTIVE_SURVEY' }
    }

    // Проверяем, не заполнял ли уже пользователь этот опрос
    const existingResponse = await prisma.teamSurveyResponse.findFirst({
      where: {
        surveyId: survey.id,
        memberId: member.id,
      },
    })

    if (existingResponse) {
      return { error: 'ALREADY_RESPONDED' }
    }

    return {
      data: {
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          questions: survey.questions.map((q) => ({
            id: q.id,
            text: q.question,
            type: q.type,
            options: q.options ? (JSON.parse(q.options) as string[]) : [],
            required: q.isRequired,
            minValue: q.minValue,
            maxValue: q.maxValue,
            minLabel: q.minLabel,
            maxLabel: q.maxLabel,
          })),
        },
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
        memberId: member.id,
      },
    }
  } catch (error) {
    console.error('[getSurveyAction] Error:', error)
    return { error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Схема ответа на вопрос
 */
const AnswerSchema = z.object({
  questionId: z.string(),
  textAnswer: z.string().optional(),
  selectedOption: z.string().optional(),
  ratingValue: z.number().min(1).max(10).optional(),
})

/**
 * Схема отправки опроса
 */
const SubmitSurveySchema = z.object({
  surveyId: z.string(),
  memberId: z.string(),
  answers: z.array(AnswerSchema),
})

/**
 * Отправить ответы на опрос
 */
export async function submitSurveyAction(data: z.infer<typeof SubmitSurveySchema>) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { error: 'UNAUTHORIZED' }
    }

    const parsed = SubmitSurveySchema.safeParse(data)
    if (!parsed.success) {
      return { error: 'VALIDATION_ERROR' }
    }

    const { surveyId, memberId, answers } = parsed.data

    // Проверяем что опрос существует и активен
    const survey = await prisma.teamSurvey.findUnique({
      where: { id: surveyId },
      include: {
        questions: true,
        organization: true,
      },
    })

    if (!survey || survey.status !== 'active') {
      return { error: 'SURVEY_NOT_FOUND' }
    }

    // Проверяем что член принадлежит текущему пользователю и организации
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        organizationId: survey.organizationId,
        userId: session.user.id,
      },
    })

    if (!member) {
      return { error: 'NOT_A_MEMBER' }
    }

    // Проверяем что пользователь ещё не отвечал
    const existingResponse = await prisma.teamSurveyResponse.findFirst({
      where: {
        surveyId,
        memberId,
      },
    })

    if (existingResponse) {
      return { error: 'ALREADY_RESPONDED' }
    }

    // Используем enhanced prisma для создания ответа
    const db = getEnhancedPrisma()

    // Создаём response и answers в транзакции
    const response = await db.teamSurveyResponse.create({
      data: {
        surveyId,
        memberId,
        status: 'completed',
        completedAt: new Date(),
        answers: {
          create: answers.map((answer) => ({
            questionId: answer.questionId,
            textValue: answer.textAnswer,
            choiceValue: answer.selectedOption,
            ratingValue: answer.ratingValue,
          })),
        },
      },
      include: {
        answers: true,
      },
    })

    return { success: true, responseId: response.id }
  } catch (error) {
    console.error('[submitSurveyAction] Error:', error)
    return { error: 'UNKNOWN_ERROR' }
  }
}
