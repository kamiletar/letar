'use server'

import { type ClientFormData, ClientFormSchema } from '@/app/(specialist)/clients/_schemas/client-form.schema'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { generateNumerologyProfileData } from '@/lib/utils/numerology'
import { revalidatePath } from 'next/cache'

interface ClientActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * ОБЩАЯ ФУНКЦИЯ ВАЛИДАЦИИ ДЛЯ CLIENT ACTIONS
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
// UPDATE - Обновление существующего клиента
// ============================================================================

/**
 * Server Action для обновления информации о клиенте
 */
export async function updateClient(clientId: string, data: ClientFormData): Promise<ClientActionResult> {
  const { session, db } = await validateSpecialistAccess()

  const parsed = ClientFormSchema.safeParse(data)

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
    // Проверяем, что клиент принадлежит этому специалисту
    const existingClient = await db.client.findFirst({
      where: {
        id: clientId,
        specialistId: session.user.id,
      },
    })

    if (!existingClient) {
      return { success: false, error: 'Клиент не найден или не принадлежит вам' }
    }

    // Если email изменился, проверяем уникальность
    if (parsed.data.email !== existingClient.email) {
      const emailExists = await db.client.findFirst({
        where: {
          email: parsed.data.email,
          specialistId: session.user.id,
          id: { not: clientId },
        },
      })

      if (emailExists) {
        return {
          success: false,
          fieldErrors: {
            email: ['Клиент с таким email уже существует'],
          },
        }
      }
    }

    // Проверяем, изменилась ли дата рождения
    const newBirthdate = parsed.data.birthdate ? new Date(parsed.data.birthdate) : null
    const birthdateChanged = existingClient.birthdate?.getTime() !== newBirthdate?.getTime()

    // Обновляем клиента
    await db.client.update({
      where: { id: clientId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        gender: parsed.data.gender || null,
        birthdate: newBirthdate,
        mainRequest: parsed.data.mainRequest || null,
        notes: parsed.data.notes || null,
      },
    })

    // Также обновляем связанного пользователя (если email изменился)
    if (existingClient.userId && parsed.data.email !== existingClient.email) {
      await db.user.update({
        where: { id: existingClient.userId },
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
        },
      })
    }

    // Автоматический пересчет нумерологического профиля при изменении даты рождения
    if (birthdateChanged && newBirthdate) {
      try {
        const numerologyData = generateNumerologyProfileData(newBirthdate)
        await db.numerologyProfile.upsert({
          where: { clientId },
          update: numerologyData,
          create: {
            clientId,
            ...numerologyData,
          },
        })
      } catch (error) {
        console.error('Failed to update numerology profile:', error)
        // Продолжаем даже если не удалось обновить профиль
      }
    }

    // Если дата рождения была удалена, удаляем нумерологический профиль
    if (birthdateChanged && !newBirthdate) {
      try {
        await db.numerologyProfile
          .delete({
            where: { clientId },
          })
          .catch(() => {
            // Игнорируем ошибку, если профиль не существует
          })
      } catch (error) {
        console.error('Failed to delete numerology profile:', error)
      }
    }

    // Ревалидируем страницы
    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to update client:', error)
    return { success: false, error: 'Не удалось обновить клиента. Попробуйте еще раз.' }
  }
}

// ============================================================================
// DELETE - Удаление клиента
// ============================================================================

/**
 * Server Action для удаления клиента
 * ВНИМАНИЕ: Удаляет клиента и все связанные данные (профили, сессии, планы, практики, результаты)
 */
export async function deleteClient(clientId: string) {
  const { session, db } = await validateSpecialistAccess()

  try {
    // Проверяем, что клиент принадлежит этому специалисту
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        specialistId: session.user.id,
      },
    })

    if (!client) {
      throw new Error('Client not found or access denied')
    }

    // Удаляем клиента (каскадное удаление настроено в schema.zmodel)
    await db.client.delete({
      where: { id: clientId },
    })

    // Ревалидируем страницы
    revalidatePath('/clients')

    return { success: true }
  } catch (error) {
    console.error('Failed to delete client:', error)
    throw new Error('Не удалось удалить клиента', { cause: error })
  }
}

// ============================================================================
// ARCHIVE - Архивирование клиента (софт-удаление)
// ============================================================================

/**
 * Server Action для архивирования клиента
 * Вместо удаления помечает клиента как неактивного
 */
export async function archiveClient(clientId: string) {
  const { session, db } = await validateSpecialistAccess()

  try {
    // Проверяем клиента
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        specialistId: session.user.id,
      },
    })

    if (!client) {
      throw new Error('Client not found or access denied')
    }

    // Помечаем как неактивного (добавляем в notes информацию об архивации)
    await db.client.update({
      where: { id: clientId },
      data: {
        notes: `[АРХИВ] ${client.notes || ''}\nАрхивирован: ${new Date().toLocaleDateString('ru-RU')}`,
      },
    })

    // Деактивируем все активные планы трансформации
    await db.transformationPlan.updateMany({
      where: {
        clientId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    // Ревалидируем страницы
    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to archive client:', error)
    throw new Error('Не удалось архивировать клиента', { cause: error })
  }
}

// ============================================================================
// GET CLIENT STATS - Получение статистики по клиенту
// ============================================================================

/**
 * Получить статистику по клиенту
 * Используется для отображения общей информации на карточке клиента
 */
export async function getClientStats(clientId: string) {
  const { session, db } = await validateSpecialistAccess()

  try {
    // Проверяем доступ к клиенту
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        specialistId: session.user.id,
      },
    })

    if (!client) {
      throw new Error('Client not found or access denied')
    }

    // Собираем статистику
    const [
      sessionsCount,
      completedSessionsCount,
      activePlanCount,
      practicesCount,
      completedPracticesCount,
      resultsCount,
      profilesCompleted,
    ] = await Promise.all([
      // Общее количество сессий
      db.therapySession.count({
        where: { clientId },
      }),
      // Завершенные сессии
      db.therapySession.count({
        where: { clientId, status: 'COMPLETED' },
      }),
      // Активные планы трансформации
      db.transformationPlan.count({
        where: { clientId, isActive: true },
      }),
      // Общее количество практик
      db.practice.count({
        where: { clientId },
      }),
      // Завершенные практики
      db.practice.count({
        where: { clientId, isCompleted: true },
      }),
      // Количество результатов
      db.result.count({
        where: { clientId },
      }),
      // Заполненные профили (из 5)
      db.client
        .findUnique({
          where: { id: clientId },
          include: {
            numerologyProfile: true,
            neuroPsychProfile: true,
            energyProfile: true,
            bodyProfile: true,
            styleProfile: true,
          },
        })
        .then((c) => {
          if (!c) {
            return 0
          }
          let count = 0
          if (c.numerologyProfile) {
            count++
          }
          if (c.neuroPsychProfile) {
            count++
          }
          if (c.energyProfile) {
            count++
          }
          if (c.bodyProfile) {
            count++
          }
          if (c.styleProfile) {
            count++
          }
          return count
        }),
    ])

    return {
      sessions: {
        total: sessionsCount,
        completed: completedSessionsCount,
      },
      plans: {
        active: activePlanCount,
      },
      practices: {
        total: practicesCount,
        completed: completedPracticesCount,
      },
      results: {
        total: resultsCount,
      },
      profiles: {
        completed: profilesCompleted,
        total: 5,
      },
    }
  } catch (error) {
    console.error('Failed to get client stats:', error)
    throw new Error('Не удалось получить статистику клиента', { cause: error })
  }
}
