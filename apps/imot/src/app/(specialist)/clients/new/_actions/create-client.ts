'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { generateNumerologyProfileData } from '@/lib/utils/numerology'
import { redirect } from 'next/navigation'
import { type ClientFormData, ClientFormSchema } from '../../_schemas/client-form.schema'

interface CreateClientResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Server action для создания нового клиента.
 * Создает или находит пользователя по email, затем создает запись клиента.
 */
export async function createClient(data: ClientFormData): Promise<CreateClientResult> {
  // 1. Аутентификация и проверка роли
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  // 2. Валидация данных
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

  // 3. Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // 4. Создание клиента
  try {
    // Проверяем, существует ли пользователь с таким email
    let user = await db.user.findUnique({
      where: { email: parsed.data.email },
    })

    // Если пользователь не существует, создаем его
    if (!user) {
      user = await db.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          role: 'CLIENT',
        },
      })
    }

    // Проверяем, не является ли этот пользователь уже клиентом данного специалиста
    const existingClient = await db.client.findFirst({
      where: {
        userId: user.id,
        specialistId: session.user.id,
      },
    })

    if (existingClient) {
      return {
        success: false,
        error: 'Этот пользователь уже является вашим клиентом',
      }
    }

    // Создаем запись клиента
    const birthdate = parsed.data.birthdate ? new Date(parsed.data.birthdate) : null

    const newClient = await db.client.create({
      data: {
        userId: user.id,
        specialistId: session.user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        gender: parsed.data.gender || null,
        birthdate,
        mainRequest: parsed.data.mainRequest || null,
        notes: parsed.data.notes || null,
      },
    })

    // Автоматическая генерация нумерологического профиля, если указана дата рождения
    if (birthdate) {
      try {
        const numerologyData = generateNumerologyProfileData(birthdate)
        await db.numerologyProfile.create({
          data: {
            clientId: newClient.id,
            ...numerologyData,
          },
        })
      } catch (error) {
        console.error('Failed to generate numerology profile:', error)
        // Продолжаем даже если не удалось сгенерировать профиль
      }
    }

    // 5. Редирект на страницу клиента с открытой вкладкой профилей
    redirect(`/clients/${newClient.id}`)
  } catch (error) {
    console.error('Failed to create client:', error)

    // Проверка уникальности email (если это проблема на уровне БД)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return {
        success: false,
        fieldErrors: {
          email: ['Клиент с таким email уже существует'],
        },
      }
    }

    return {
      success: false,
      error: 'Не удалось создать клиента. Попробуйте еще раз.',
    }
  }
}
