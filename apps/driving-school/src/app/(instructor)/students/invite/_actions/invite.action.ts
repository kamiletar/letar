'use server'

import { requireInstructor } from '@/lib/action-helpers'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'

import { addStudentToInstructorChatAction } from '@/app/(chats)/chats/_actions/chat.action'

import {
  calculateExpirationDate,
  type CreateInviteByEmailData,
  CreateInviteByEmailSchema,
  isInvitationExpired,
} from '../_schemas/invite.schema'

// === Типы результатов ===

export type CreateInvitationResult =
  | { success: true; token: string; expiresAt: Date }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_INSTRUCTOR' | 'ALREADY_CONNECTED' | 'UNKNOWN_ERROR' }

export type AcceptInvitationResult =
  | { success: true }
  | {
      success: false
      error: 'UNAUTHORIZED' | 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_ACCEPTED' | 'NOT_STUDENT' | 'UNKNOWN_ERROR'
    }

export type DeclineInvitationResult =
  | { success: true }
  | { success: false; error: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_PROCESSED' | 'UNKNOWN_ERROR' }

export type GetInvitationResult =
  | {
      success: true
      invitation: {
        token: string
        email: string | null
        status: string
        expiresAt: Date
        instructorName: string | null
      }
    }
  | { success: false; error: 'NOT_FOUND' | 'UNKNOWN_ERROR' }

// === Server Actions ===

/**
 * Создание приглашения по email (только для инструкторов)
 */
export async function createInvitationAction(data: CreateInviteByEmailData): Promise<CreateInvitationResult> {
  // Проверяем авторизацию
  const authResult = await requireInstructor()
  if (!authResult.success) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const { instructorProfileId, user } = authResult
  const db = getEnhancedPrisma(user)

  // Валидируем данные (схема уже валидирует email формат и trim)
  const parsed = CreateInviteByEmailSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'UNKNOWN_ERROR' }
  }

  // Email может быть пустой строкой (для ссылки без email) или валидный email
  const email = parsed.data.email || null

  try {
    // Проверяем, не существует ли уже активная связь с этим учеником
    if (email && email.length > 0) {
      const existingStudent = await db.user.findUnique({
        where: { email },
        include: { studentProfile: true },
      })

      if (existingStudent?.studentProfile) {
        const existingConnection = await db.studentInstructorConnection.findFirst({
          where: {
            studentId: existingStudent.studentProfile.id,
            instructorId: instructorProfileId,
            status: 'ACTIVE',
          },
        })

        if (existingConnection) {
          return { success: false, error: 'ALREADY_CONNECTED' }
        }
      }
    }

    // Создаём приглашение
    const expiresAt = calculateExpirationDate()

    const invitation = await db.invitation.create({
      data: {
        instructorId: instructorProfileId,
        email,
        status: 'PENDING',
        expiresAt,
      },
    })

    return { success: true, token: invitation.token, expiresAt }
  } catch (error) {
    console.error('Create invitation error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Принятие приглашения (только для учеников)
 */
export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  try {
    // Проверяем авторизацию
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем что пользователь - ученик
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { studentProfile: true },
    })

    // Проверяем наличие профиля ученика
    if (!user || !user.studentProfile) {
      return { success: false, error: 'NOT_STUDENT' }
    }

    // Находим приглашение с данными инструктора
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        instructor: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    })

    if (!invitation) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем статус
    if (invitation.status === 'ACCEPTED') {
      return { success: false, error: 'ALREADY_ACCEPTED' }
    }

    if (invitation.status !== 'PENDING') {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем истечение
    if (isInvitationExpired(invitation.expiresAt)) {
      // Обновляем статус на EXPIRED
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return { success: false, error: 'EXPIRED' }
    }

    // Проверяем, существует ли уже связь между учеником и инструктором
    const existingConnection = await db.studentInstructorConnection.findFirst({
      where: {
        studentId: user.studentProfile.id,
        instructorId: invitation.instructorId,
      },
    })

    if (existingConnection) {
      // Если связь ACTIVE — уже связаны
      if (existingConnection.status === 'ACTIVE') {
        return { success: false, error: 'ALREADY_ACCEPTED' }
      }

      // Если связь DISCONNECTED или PAUSED — восстанавливаем
      await db.$transaction([
        db.studentInstructorConnection.update({
          where: { id: existingConnection.id },
          data: { status: 'ACTIVE' },
        }),
        db.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        }),
      ])
    } else {
      // Создаём новую связь
      await db.$transaction([
        db.studentInstructorConnection.create({
          data: {
            studentId: user.studentProfile.id,
            instructorId: invitation.instructorId,
            status: 'ACTIVE',
            isPrimary: false,
            prepaidLessons: 0,
          },
        }),
        db.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        }),
      ])
    }

    // Добавляем ученика в чат инструктора (фрилансерский чат)
    const instructorUserId = invitation.instructor.user.id
    await addStudentToInstructorChatAction(instructorUserId, user.id)

    return { success: true }
  } catch (error) {
    console.error('Accept invitation error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Отклонение приглашения
 */
export async function declineInvitation(token: string): Promise<DeclineInvitationResult> {
  try {
    // Получаем сессию для access control (можно отклонять без авторизации)
    const session = await getSession()
    const db = getEnhancedPrisma(session?.user ?? null)

    // Находим приглашение
    const invitation = await db.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем статус
    if (invitation.status !== 'PENDING') {
      return { success: false, error: 'ALREADY_PROCESSED' }
    }

    // Проверяем истечение
    if (isInvitationExpired(invitation.expiresAt)) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return { success: false, error: 'EXPIRED' }
    }

    // Обновляем статус
    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'DECLINED',
        declinedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Decline invitation error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Получение информации о приглашении по токену
 */
export async function getInvitation(token: string): Promise<GetInvitationResult> {
  try {
    // Используем raw Prisma — policy @@allow('read', true) открыта для всех,
    // а enhanced client генерирует невалидный SQL при nested include instructor.user
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        instructor: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    })

    if (!invitation) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Автоматически проверяем истечение
    let status = invitation.status
    if (status === 'PENDING' && isInvitationExpired(invitation.expiresAt)) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      status = 'EXPIRED'
    }

    return {
      success: true,
      invitation: {
        token: invitation.token,
        email: invitation.email,
        status,
        expiresAt: invitation.expiresAt,
        instructorName: invitation.instructor.user.name,
      },
    }
  } catch (error) {
    console.error('Get invitation error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Получение списка приглашений инструктора
 */
export async function getMyInvitations() {
  try {
    const authResult = await requireInstructor()
    if (!authResult.success) {
      return null
    }
    const { instructorProfileId, user } = authResult
    const db = getEnhancedPrisma(user)

    const invitations = await db.invitation.findMany({
      where: { instructorId: instructorProfileId },
      orderBy: { createdAt: 'desc' },
    })

    // Batch UPDATE: обновляем все истекшие приглашения одним запросом (вместо N)
    const now = new Date()
    const expiredIds = invitations
      .filter((inv) => inv.status === 'PENDING' && isInvitationExpired(inv.expiresAt, now))
      .map((inv) => inv.id)

    if (expiredIds.length > 0) {
      await db.invitation.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      })
    }

    // Обновляем статусы в памяти для возврата актуальных данных
    const expiredSet = new Set(expiredIds)

    return invitations.map((inv) => ({
      id: inv.id,
      token: inv.token,
      email: inv.email,
      status: expiredSet.has(inv.id) ? 'EXPIRED' : inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
      declinedAt: inv.declinedAt,
    }))
  } catch (error) {
    console.error('Get my invitations error:', error)
    return null
  }
}
