'use server'

import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type DraftRequestFormData, draftRequestSchema } from '../_schemas/draft-request.schema'

/** Результат сохранения черновика запроса */
type SubmitDraftRequestResult = { success: true } | { success: false; error: string }

/**
 * Server action для сохранения черновика запроса клиента
 */
export async function submitDraftRequest(
  ids: { clientId?: string; userId?: string },
  data: DraftRequestFormData
): Promise<SubmitDraftRequestResult> {
  // Проверяем авторизацию
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Валидация данных
  const parsed = draftRequestSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // Получаем enhanced Prisma client с политиками доступа
  const db = getEnhancedPrisma(session.user)
  const { mainRequest, birthdate, gender } = parsed.data

  try {
    let clientId = ids.clientId

    if (!clientId) {
      if (!ids.userId) {
        throw new Error('User ID is required to create a client profile')
      }

      // Проверяем, есть ли уже профиль (на случай гонки)
      const existingClient = await db.client.findUnique({
        where: { userId: ids.userId },
      })

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Ищем специалиста для назначения
        // TODO: Реализовать более умное распределение или выбор специалиста
        // ВАЖНО: Используем raw prisma без политик ZenStack,
        // так как CLIENT не может читать других пользователей по политикам,
        // но назначение специалиста - это системная операция
        const specialist = await prisma.user.findFirst({
          where: { role: 'SPECIALIST' },
        })

        if (!specialist) {
          return {
            success: false,
            error: 'Не удалось найти специалиста для назначения. Пожалуйста, обратитесь к администратору.',
          }
        }

        // Получаем данные пользователя для создания профиля
        const user = await prisma.user.findUnique({ where: { id: ids.userId } })

        // ВАЖНО: Используем raw prisma для создания Client,
        // так как CLIENT не может создавать профили по политикам
        // (разрешено только специалисту и админу),
        // но это системная операция при первой регистрации
        const newClient = await prisma.client.create({
          data: {
            userId: ids.userId,
            specialistId: specialist.id,
            name: user?.name || 'Новый клиент',
            email: user?.email || 'placeholder@example.com',
            mainRequest: mainRequest,
            birthdate: new Date(birthdate),
            gender: gender as Gender,
          },
        })
        clientId = newClient.id
      }
    } else {
      // Обновляем существующий профиль
      await db.client.update({
        where: { id: clientId },
        data: {
          mainRequest: mainRequest,
          birthdate: new Date(birthdate),
          gender: gender as Gender,
        },
      })
    }

    // ВАЖНО: Используем raw prisma для создания истории запросов,
    // так как CLIENT не может создавать записи по политикам
    // (разрешено только специалисту и админу)
    await prisma.primaryRequestHistory.create({
      data: {
        clientId: clientId!,
        requestText: mainRequest,
        version: 1,
        isApproved: false,
      },
    })

    // Ревалидируем пути
    revalidatePath('/draft-request')
    revalidatePath('/my-profile')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Error submitting draft request:', error)
    return { success: false, error: 'Не удалось сохранить запрос. Попробуйте еще раз.' }
  }

  // Редиректим на профиль
  redirect('/my-profile')
}
