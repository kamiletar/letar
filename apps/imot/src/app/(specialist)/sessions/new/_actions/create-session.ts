'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { type SessionFormData, SessionFormSchema } from '../../_schemas/session-form.schema'

/** Результат создания сессии */
type CreateSessionResult = { success: true } | { success: false; error: string; field?: string }

/**
 * Server action для создания новой сессии.
 */
export async function createSession(data: SessionFormData): Promise<CreateSessionResult> {
  // 1. Аутентификация и проверка роли
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  // 2. Парсинг и валидация данных
  const parsed = SessionFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // 3. Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // 4. Создание сессии
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

    // Создаем сессию
    await db.therapySession.create({
      data: {
        clientId: parsed.data.clientId,
        specialistId: session.user.id,
        scheduledAt: new Date(parsed.data.scheduledAt),
        duration: parsed.data.duration,
        status: parsed.data.status,
        topic: parsed.data.topic || null,
        notes: parsed.data.notes || null,
        homework: parsed.data.homework || null,
        // Integrations (ЭТАП 7.2)
        meetingUrl: parsed.data.meetingUrl || null,
        paymentUrl: parsed.data.paymentUrl || null,
        paymentStatus: parsed.data.paymentStatus || null,
      },
    })
  } catch (error) {
    console.error('Failed to create session:', error)
    return { success: false, error: 'Не удалось создать сессию. Попробуйте еще раз.' }
  }

  // 5. Редирект на страницу списка сессий
  redirect('/sessions')
}
