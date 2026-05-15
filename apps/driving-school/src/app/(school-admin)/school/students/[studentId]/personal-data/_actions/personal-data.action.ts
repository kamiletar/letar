'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { type StudentPersonalData, StudentPersonalDataSchema } from '../_schemas/passport.schema'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

/**
 * Обновление персональных данных ученика (паспорт, адрес)
 */
export async function updateStudentPersonalData(
  studentProgressId: string,
  data: StudentPersonalData
): Promise<ActionResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  // Валидация входных данных
  const parsed = StudentPersonalDataSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // Проверяем что пользователь — менеджер школы
  const studentProgress = await prisma.studentProgress.findFirst({
    where: {
      id: studentProgressId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: { in: ['owner', 'super_manager', 'manager'] },
          },
        },
      },
    },
  })

  if (!studentProgress) {
    return { success: false, error: 'Ученик не найден или нет доступа' }
  }

  // Обновляем данные
  await prisma.studentProgress.update({
    where: { id: studentProgressId },
    data: {
      passport: parsed.data.passport,
      registrationAddress: parsed.data.registrationAddress,
      snils: parsed.data.snils || null,
      inn: parsed.data.inn || null,
    },
  })

  return { success: true, data: undefined }
}

/**
 * Получение персональных данных ученика
 */
export async function getStudentPersonalData(
  studentProgressId: string
): Promise<ActionResult<StudentPersonalData | null>> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  // Проверяем права — или сам ученик, или менеджер школы
  const studentProgress = await prisma.studentProgress.findFirst({
    where: {
      id: studentProgressId,
      OR: [
        { userId: session.user.id },
        {
          organization: {
            members: {
              some: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager', 'manager'] },
              },
            },
          },
        },
      ],
    },
    select: {
      passport: true,
      registrationAddress: true,
      snils: true,
      inn: true,
    },
  })

  if (!studentProgress) {
    return { success: false, error: 'Ученик не найден или нет доступа' }
  }

  // Если данных нет — возвращаем null
  if (!studentProgress.passport) {
    return { success: true, data: null }
  }

  return {
    success: true,
    data: {
      passport: studentProgress.passport as StudentPersonalData['passport'],
      registrationAddress: studentProgress.registrationAddress || '',
      snils: studentProgress.snils || undefined,
      inn: studentProgress.inn || undefined,
    },
  }
}
