'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { sendNewPracticeEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { type PracticeFormData, PracticeFormSchema } from '../../_schemas/practice-form.schema'

/** Результат создания практики */
type CreatePracticeResult = { success: true } | { success: false; error: string; field?: string }

/**
 * Server action для создания новой практики для клиента.
 */
export async function createPractice(data: PracticeFormData): Promise<CreatePracticeResult> {
  // 1. Аутентификация и проверка роли
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  // 2. Парсинг и валидация данных
  const parsed = PracticeFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // 3. Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // 4. Создание практики
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

    // Создаем практику
    const practice = await db.practice.create({
      data: {
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        description: parsed.data.description,
        level: parsed.data.level,
        instructions: parsed.data.instructions,
        frequency: parsed.data.frequency || null,
        duration: parsed.data.duration || null,
        materials: parsed.data.materials || null,
        videoUrl: parsed.data.videoUrl || null,
        audioUrl: parsed.data.audioUrl || null,
        isAssigned: parsed.data.isAssigned,
        notes: parsed.data.notes || null,
      },
    })

    // Отправить email уведомление клиенту (если практика назначена)
    if (parsed.data.isAssigned) {
      try {
        const clientUser = await db.user.findUnique({
          where: { id: client.userId },
          select: {
            email: true,
            name: true,
            emailNotifications: true,
            notifyNewPractices: true,
          },
        })

        if (clientUser?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

          await sendNewPracticeEmail(
            clientUser.email,
            {
              clientName: clientUser.name || 'Уважаемый клиент',
              practiceName: practice.title,
              practiceDescription: practice.description,
              practiceLevel: practice.level,
              duration: practice.duration || 'Не указана',
              frequency: practice.frequency || 'По необходимости',
              practicesUrl: `${baseUrl}/practices`,
            },
            {
              emailNotifications: clientUser.emailNotifications,
              notifyNewPractices: clientUser.notifyNewPractices,
            }
          )
        }
      } catch (emailError) {
        // Не прерываем процесс, если email не отправился
        console.error('Failed to send practice notification email:', emailError)
      }
    }

    // Ревалидация кеша для страницы плана
    revalidatePath(`/plans`)

    return { success: true }
  } catch (error) {
    console.error('Failed to create practice:', error)
    return { success: false, error: 'Не удалось создать практику. Попробуйте еще раз.' }
  }
}
