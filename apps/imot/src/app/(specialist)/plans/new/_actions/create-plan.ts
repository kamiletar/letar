'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { type PlanFormData, PlanFormSchema } from '../../_schemas/plan-form.schema'

/** Результат создания плана */
type CreatePlanResult = { success: true } | { success: false; error: string; field?: string }

/**
 * Server action для создания нового плана трансформации.
 */
export async function createPlan(data: PlanFormData): Promise<CreatePlanResult> {
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

  // 4. Создание плана трансформации
  try {
    // Проверяем, что клиент принадлежит специалисту
    const client = await db.client.findFirst({
      where: {
        id: parsed.data.clientId,
        specialistId: session.user.id,
      },
    })

    if (!client) {
      return { success: false, error: 'Клиент не найден или не принадлежит вам', field: 'clientId' }
    }

    // Получаем текущую максимальную версию запроса для клиента
    const lastRequest = await db.primaryRequestHistory.findFirst({
      where: { clientId: parsed.data.clientId },
      orderBy: { version: 'desc' },
    })

    const nextVersion = (lastRequest?.version ?? 0) + 1

    // Создаем план трансформации и запись в истории запросов в транзакции
    const plan = await db.transformationPlan.create({
      data: {
        clientId: parsed.data.clientId,
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

    // Создаем запись в истории запросов
    await db.primaryRequestHistory.create({
      data: {
        clientId: parsed.data.clientId,
        requestText: parsed.data.primaryRequest,
        version: nextVersion,
        changedBy: session.user.id,
        changeReason: parsed.data.changeReason || null,
        planId: plan.id,
        isApproved: true, // При создании плана запрос автоматически утверждается
        approvedAt: new Date(),
      },
    })

    // Обновляем mainRequest в Client
    await db.client.update({
      where: { id: parsed.data.clientId },
      data: { mainRequest: parsed.data.primaryRequest },
    })

    // Редирект на страницу просмотра созданного плана
    redirect(`/plans/${plan.id}`)
  } catch (error) {
    console.error('Failed to create plan:', error)
    return { success: false, error: 'Не удалось создать план трансформации. Попробуйте еще раз.' }
  }
}
