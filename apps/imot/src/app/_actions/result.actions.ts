'use server'

import {
  type ResultCreateInput,
  ResultCreateSchema,
  type ResultUpdateInput,
  ResultUpdateSchema,
} from '@/app/_schemas/result.schema'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

interface ResultActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * ОБЩАЯ ФУНКЦИЯ ВАЛИДАЦИИ ДЛЯ RESULT ACTIONS
 * Проверяет аутентификацию и роль пользователя (специалист или админ)
 */
async function validateSpecialistAccess() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  return { session, db: getEnhancedPrisma(session.user) }
}

// ============================================================================
// CREATE - Создание нового результата
// ============================================================================

/**
 * Server Action для создания нового результата измерения прогресса клиента
 */
export async function createResult(data: ResultCreateInput): Promise<ResultActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = ResultCreateSchema.safeParse(data)

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? 'form'
      if (!fieldErrors[field]) {
        fieldErrors[field] = []
      }
      fieldErrors[field].push(issue.message)
    }
    return { success: false, fieldErrors }
  }

  try {
    const { clientId, practiceId, measuredAt, description, notes, ...rest } = parsed.data

    // Проверяем, что клиент принадлежит этому специалисту
    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return {
        success: false,
        fieldErrors: {
          clientId: ['Клиент не найден'],
        },
      }
    }

    // Если указана практика, проверяем её существование
    if (practiceId) {
      const practice = await db.practice.findUnique({
        where: { id: practiceId },
      })

      if (!practice) {
        return {
          success: false,
          fieldErrors: {
            practiceId: ['Практика не найдена'],
          },
        }
      }
    }

    // Создаем результат
    await db.result.create({
      data: {
        clientId,
        ...rest,
        description: description || null,
        practiceId: practiceId || null,
        notes: notes || null,
        measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
      },
    })

    // Ревалидируем страницы
    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/progress')

    return { success: true }
  } catch (error) {
    console.error('Failed to create result:', error)
    return { success: false, error: 'Не удалось создать результат. Попробуйте еще раз.' }
  }
}

// ============================================================================
// UPDATE - Обновление существующего результата
// ============================================================================

/**
 * Server Action для обновления результата
 */
export async function updateResult(data: ResultUpdateInput): Promise<ResultActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = ResultUpdateSchema.safeParse(data)

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? 'form'
      if (!fieldErrors[field]) {
        fieldErrors[field] = []
      }
      fieldErrors[field].push(issue.message)
    }
    return { success: false, fieldErrors }
  }

  try {
    const { id, description, notes, ...rest } = parsed.data

    // Получаем существующий результат
    const existingResult = await db.result.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!existingResult) {
      return { success: false, error: 'Результат не найден' }
    }

    // Обновляем результат
    await db.result.update({
      where: { id },
      data: {
        ...rest,
        description: description || null,
        notes: notes || null,
      },
    })

    // Ревалидируем страницы
    revalidatePath(`/clients/${existingResult.clientId}`)
    revalidatePath('/progress')

    return { success: true }
  } catch (error) {
    console.error('Failed to update result:', error)
    return { success: false, error: 'Не удалось обновить результат. Попробуйте еще раз.' }
  }
}

// ============================================================================
// DELETE - Удаление результата
// ============================================================================

/**
 * Server Action для удаления результата
 */
export async function deleteResult(id: string) {
  const { db } = await validateSpecialistAccess()

  try {
    // Получаем результат для проверки доступа
    const existingResult = await db.result.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!existingResult) {
      throw new Error('Result not found')
    }

    // Удаляем результат
    await db.result.delete({
      where: { id },
    })

    // Ревалидируем страницы
    revalidatePath(`/clients/${existingResult.clientId}`)
    revalidatePath('/progress')

    return { success: true }
  } catch (error) {
    console.error('Failed to delete result:', error)
    throw new Error('Не удалось удалить результат', { cause: error })
  }
}

// ============================================================================
// BATCH CREATE - Пакетное создание результатов
// ============================================================================

/**
 * Server Action для пакетного создания результатов
 * Используется для одновременной записи нескольких измерений
 */
export async function createResultsBatch(
  clientId: string,
  results: Array<{
    level: string
    metric: string
    value: number
    description?: string
    practiceId?: string
  }>
) {
  const { db } = await validateSpecialistAccess()

  try {
    // Проверяем клиента
    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      throw new Error('Client not found')
    }

    // Создаем результаты пакетом
    await db.result.createMany({
      data: results.map((r) => ({
        clientId,
        level: r.level,
        metric: r.metric,
        value: r.value,
        description: r.description || null,
        practiceId: r.practiceId || null,
        measuredAt: new Date(),
      })),
    })

    // Ревалидируем страницы
    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/progress')

    return { success: true }
  } catch (error) {
    console.error('Failed to create results batch:', error)
    throw new Error('Не удалось создать результаты', { cause: error })
  }
}
