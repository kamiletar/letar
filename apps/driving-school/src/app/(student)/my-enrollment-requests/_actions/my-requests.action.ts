'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Получение заявок ученика
 */
export async function getMyEnrollmentRequestsAction(): Promise<{
  success: boolean
  error?: string
  requests?: Array<{
    id: string
    type: string
    status: string
    message: string | null
    rejectReason: string | null
    createdAt: Date
    processedAt: Date | null
    instructor: {
      id: string
      name: string | null
      image: string | null
      bio: string | null
    } | null
    organization: {
      id: string
      name: string
    } | null
    vehicle: {
      id: string
      brand: string
      model: string
    } | null
  }>
}> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // Используем базовый prisma вместо enhanced из-за бага ZenStack с lateral joins
  // Access control обеспечен через where: { studentId: session.user.id }
  const requests = await prisma.enrollmentRequest.findMany({
    where: {
      studentId: session.user.id,
    },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          image: true,
          instructorProfile: {
            select: {
              bio: true,
            },
          },
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return {
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      message: r.message,
      rejectReason: r.rejectReason,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
      instructor: r.instructor
        ? {
            id: r.instructor.id,
            name: r.instructor.name,
            image: r.instructor.image,
            bio: r.instructor.instructorProfile?.bio ?? null,
          }
        : null,
      organization: r.organization,
      vehicle: r.vehicle,
    })),
  }
}

/**
 * Отмена заявки учеником
 */
export async function cancelEnrollmentRequestAction(requestId: string): Promise<ActionResult> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // Используем базовый prisma — access control через ручную проверку studentId
  // Получаем заявку
  const request = await prisma.enrollmentRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return { success: false, error: 'Заявка не найдена' }
  }

  // Проверяем, что заявка принадлежит текущему пользователю
  if (request.studentId !== session.user.id) {
    return { success: false, error: 'Эта заявка не ваша' }
  }

  // Проверяем статус
  if (request.status !== 'PENDING') {
    return { success: false, error: 'Заявку можно отменить только в статусе ожидания' }
  }

  // Обновляем статус
  await prisma.enrollmentRequest.update({
    where: { id: requestId },
    data: {
      status: 'CANCELLED',
    },
  })

  revalidatePath('/my-enrollment-requests')

  return { success: true }
}
