'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { type PlanFormData, PlanFormSchema } from '../../../_schemas/plan-form.schema'

/** Результат обновления плана */
type UpdatePlanResult = { success: true } | { success: false; error: string }

/**
 * Server action для обновления плана трансформации.
 */
export async function updatePlan(planId: string, data: PlanFormData): Promise<UpdatePlanResult> {
  // 1. Аутентификация и проверка роли
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  // 2. Парсинг и валидация данных
  const parsed = PlanFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // 3. Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // 4. Обновление плана трансформации
  try {
    // Проверяем, что план существует и принадлежит специалисту
    const existingPlan = await db.transformationPlan.findFirst({
      where: {
        id: planId,
        client: {
          specialistId: session.user.id,
        },
      },
    })

    if (!existingPlan) {
      return { success: false, error: 'План трансформации не найден или не принадлежит вам' }
    }

    // Проверяем, изменился ли основной запрос
    const requestChanged = existingPlan.primaryRequest !== parsed.data.primaryRequest

    // Обновляем план
    await db.transformationPlan.update({
      where: { id: planId },
      data: {
        currentStage: parsed.data.currentStage,
        primaryRequest: parsed.data.primaryRequest,
        diagnosticsDescription: parsed.data.diagnosticsDescription || null,
        integrationDescription: parsed.data.integrationDescription || null,
        strategyDescription: parsed.data.strategyDescription || null,
        practiceDescription: parsed.data.practiceDescription || null,
        expectedResults: parsed.data.expectedResults || null,
        keyPoints: parsed.data.keyPoints || null,
        priorities: parsed.data.priorities || null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        expectedEndDate: parsed.data.expectedEndDate ? new Date(parsed.data.expectedEndDate) : null,
        isActive: parsed.data.isActive,
        isCompleted: parsed.data.isCompleted,
        notes: parsed.data.notes || null,
      },
    })

    // Если запрос изменился, создаем новую запись в истории
    if (requestChanged) {
      // Получаем текущую максимальную версию запроса для клиента
      const lastRequest = await db.primaryRequestHistory.findFirst({
        where: { clientId: existingPlan.clientId },
        orderBy: { version: 'desc' },
      })

      const nextVersion = (lastRequest?.version ?? 0) + 1

      // Создаем запись в истории запросов
      await db.primaryRequestHistory.create({
        data: {
          clientId: existingPlan.clientId,
          requestText: parsed.data.primaryRequest,
          version: nextVersion,
          changedBy: session.user.id,
          changeReason: parsed.data.changeReason || 'Обновление при редактировании плана',
          planId: planId,
          isApproved: true, // При обновлении плана запрос автоматически утверждается
          approvedAt: new Date(),
        },
      })

      // Обновляем mainRequest в Client
      await db.client.update({
        where: { id: existingPlan.clientId },
        data: { mainRequest: parsed.data.primaryRequest },
      })
    }
  } catch (error) {
    console.error('Failed to update plan:', error)
    return { success: false, error: 'Не удалось обновить план трансформации. Попробуйте еще раз.' }
  }

  // 5. Редирект на страницу просмотра плана
  redirect(`/plans/${planId}`)
}
