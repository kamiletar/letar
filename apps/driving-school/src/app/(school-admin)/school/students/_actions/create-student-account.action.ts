'use server'

import { sendStudentActivationEmail } from '@letar/email'

import { getAppUrl } from '@/lib/app-url'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { z } from 'zod/v4'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

/**
 * Схема данных для создания ученика
 */
const CreateStudentSchema = z
  .object({
    email: z.email('Введите корректный email'),
    name: z.string().min(2, 'Введите ФИО (минимум 2 символа)'),
    phone: z.string().optional(),
    birthdate: z.string().optional(),
    organizationId: z.string().min(1, 'Выберите школу'),
  })
  .strip()

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>

/**
 * Создание аккаунта ученика менеджером
 *
 * 1. Проверяет права (менеджер школы)
 * 2. Проверяет что email не занят
 * 3. Создаёт OrganizationInvitation с metadata
 * 4. Отправляет email с ссылкой активации
 */
export async function createStudentAccountAction(
  input: CreateStudentInput
): Promise<ActionResult<{ invitationId: string }>> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  // Валидация
  const parsed = CreateStudentSchema.safeParse(input)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { success: false, error: firstError || 'Некорректные данные' }
  }

  const { email, name, phone, birthdate, organizationId } = parsed.data

  // Проверяем что пользователь — менеджер школы
  const membership = await prisma.member.findFirst({
    where: {
      organizationId,
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!membership) {
    return { success: false, error: 'Нет прав для создания учеников в этой школе' }
  }

  // Проверяем что email не занят
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    // Проверяем есть ли уже ученик в этой школе
    const existingProgress = await prisma.studentProgress.findFirst({
      where: {
        userId: existingUser.id,
        organizationId,
      },
    })

    if (existingProgress) {
      return { success: false, error: 'Ученик с таким email уже есть в школе' }
    }

    // Пользователь есть, но не ученик — можно добавить как ученика
    // Создаём Member и StudentProgress напрямую
    await prisma.$transaction(async (tx) => {
      // Проверяем нет ли уже membership
      const existingMember = await tx.member.findFirst({
        where: {
          organizationId,
          userId: existingUser.id,
        },
      })

      if (!existingMember) {
        await tx.member.create({
          data: {
            organizationId,
            userId: existingUser.id,
            role: 'member',
          },
        })
      }

      // Обновляем дату рождения в User, если передана
      if (birthdate) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { birthdate: new Date(birthdate) },
        })
      }

      await tx.studentProgress.create({
        data: {
          organizationId,
          userId: existingUser.id,
        },
      })
    })

    return {
      success: true,
      data: { invitationId: 'existing-user' },
    }
  }

  // Генерируем токен приглашения (используется в ссылке)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 дней

  // Создаём приглашение
  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId,
      email,
      role: 'member',
      inviterId: session.user.id,
      status: 'pending',
      expiresAt,
      metadata: {
        createAccount: true,
        prefillData: {
          name,
          phone: phone || null,
          birthdate: birthdate || null,
        },
      },
    },
  })

  // Отправляем email
  const baseUrl = getAppUrl()
  const activationUrl = `${baseUrl}/join-school/${invitation.id}`

  try {
    await sendStudentActivationEmail({
      to: email,
      schoolName: membership.organization.name,
      studentName: name.split(' ')[0], // Только имя
      activationUrl,
      expiresInDays: 7,
    })
  } catch (error) {
    console.error('Ошибка отправки email:', error)
    // Удаляем приглашение если email не отправился
    await prisma.organizationInvitation.delete({
      where: { id: invitation.id },
    })
    return { success: false, error: 'Не удалось отправить email' }
  }

  return {
    success: true,
    data: { invitationId: invitation.id },
  }
}

/**
 * Получение списка приглашений школы
 */
export async function getSchoolInvitations(organizationId: string) {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      organizationId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: { in: ['owner', 'super_manager', 'manager'] },
          },
        },
      },
    },
    include: {
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return { success: true, data: invitations }
}

/**
 * Отмена приглашения
 */
export async function cancelInvitation(invitationId: string): Promise<ActionResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const invitation = await prisma.organizationInvitation.findFirst({
    where: {
      id: invitationId,
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

  if (!invitation) {
    return { success: false, error: 'Приглашение не найдено' }
  }

  await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: { status: 'canceled' },
  })

  return { success: true, data: undefined }
}

/**
 * Повторная отправка приглашения
 */
export async function resendInvitation(invitationId: string): Promise<ActionResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const invitation = await prisma.organizationInvitation.findFirst({
    where: {
      id: invitationId,
      status: 'pending',
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: { in: ['owner', 'super_manager', 'manager'] },
          },
        },
      },
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!invitation) {
    return { success: false, error: 'Приглашение не найдено или уже использовано' }
  }

  // Обновляем срок действия
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: { expiresAt },
  })

  // Отправляем email повторно
  const baseUrl = getAppUrl()
  const activationUrl = `${baseUrl}/join-school/${invitation.id}`

  const metadata = invitation.metadata as { prefillData?: { name?: string } } | null
  const studentName = metadata?.prefillData?.name?.split(' ')[0]

  try {
    await sendStudentActivationEmail({
      to: invitation.email,
      schoolName: invitation.organization.name,
      studentName,
      activationUrl,
      expiresInDays: 7,
    })
  } catch (error) {
    console.error('Ошибка отправки email:', error)
    return { success: false, error: 'Не удалось отправить email' }
  }

  return { success: true, data: undefined }
}
