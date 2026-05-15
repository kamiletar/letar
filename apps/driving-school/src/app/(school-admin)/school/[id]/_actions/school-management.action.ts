'use server'

import { type AuthError, requireSchoolManager, requireSchoolMember, withSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import type { MemberRole } from '@/lib/schools/school-service'
import { sendInvitationEmail } from '@letar/email'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Типы
// ============================================================================

export interface SchoolDetails {
  id: string
  name: string
  logo: string | null
  description: string | null
  phone: string | null
  email: string | null
  createdAt: Date
}

export interface SchoolMember {
  id: string
  userId: string
  role: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface SchoolInvitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  createdAt: Date
}

// ============================================================================
// Получение данных школы
// ============================================================================

export type GetSchoolResult =
  | {
      success: true
      school: SchoolDetails
      members: SchoolMember[]
      invitations: SchoolInvitation[]
      isAdmin: boolean
      isManager: boolean
      canManage: boolean // true если ADMIN или MANAGER
    }
  | { success: false; error: AuthError | 'SCHOOL_NOT_FOUND' }

export async function getSchoolDetails(organizationId: string): Promise<GetSchoolResult> {
  // Проверяем членство в школе (любая роль)
  const authResult = await requireSchoolMember(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  // ZenStack v3 баг: include с nested relations генерирует невалидный SQL (42P01)
  // Используем prisma напрямую, доступ уже проверен через requireSchoolMember
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      },
      invitations: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!organization) {
    return { success: false, error: 'SCHOOL_NOT_FOUND' }
  }

  const membership = organization.members.find((m) => m.userId === authResult.user.id)

  // Дополнительная проверка на случай, если членство не найдено
  // (хотя requireSchoolMember уже это проверил)
  if (!membership) {
    return { success: false, error: 'NOT_SCHOOL_MEMBER' }
  }

  const isAdmin = membership.role === 'owner'
  const isManager = membership.role === 'manager'
  const canManage = isAdmin || isManager

  return {
    success: true,
    school: {
      id: organization.id,
      name: organization.name,
      logo: organization.logo,
      description: organization.description,
      phone: organization.phone,
      email: organization.email,
      createdAt: organization.createdAt,
    },
    members: organization.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    })),
    invitations: organization.invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    })),
    isAdmin,
    isManager,
    canManage,
  }
}

// ============================================================================
// Приглашения
// ============================================================================

export type CreateInvitationResult =
  | { success: true }
  | {
      success: false
      error: AuthError | 'CANNOT_INVITE_MANAGER' | 'UNKNOWN_ERROR'
    }

export async function createInvitationAction(
  organizationId: string,
  data: { email?: string; role: MemberRole }
): Promise<CreateInvitationResult> {
  // ADMIN или MANAGER могут приглашать
  const authResult = await requireSchoolManager(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: organizationId, userId: authResult.user.id } },
    })

    // Менеджер не может приглашать менеджеров
    if (membership?.role === 'manager' && data.role === 'manager') {
      return { success: false, error: 'CANNOT_INVITE_MANAGER' }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 дней

    // Получаем название школы для email
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    const invitation = await db.organizationInvitation.create({
      data: {
        organizationId: organizationId,
        email: data.email?.trim() || '',
        role: data.role,
        inviterId: authResult.user.id,
        expiresAt,
      },
    })

    // Отправляем email, если указан адрес
    if (data.email?.trim() && organization) {
      try {
        const baseUrl = process.env.BETTER_AUTH_URL || 'https://направа.рф'
        const inviteUrl = `${baseUrl}/join-school/${invitation.id}`

        await sendInvitationEmail(
          {
            to: data.email.trim(),
            inviterName: authResult.user.name || 'Администратор',
            organizationName: organization.name,
            inviteUrl,
          },
          {
            appName: 'НаПрава.РФ',
            headerColor: '#1a365d',
            buttonColor: '#CA9E67',
          }
        )
      } catch (emailError) {
        // Логируем ошибку, но не прерываем создание приглашения
        console.error('Failed to send invitation email:', emailError)
      }
    }

    revalidatePath(`/school/${organizationId}`)
    return { success: true }
  } catch (error) {
    console.error('Create invitation error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

export type CancelInvitationResult = { success: true } | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

export async function cancelInvitationAction(
  organizationId: string,
  invitationId: string
): Promise<CancelInvitationResult> {
  // ADMIN или MANAGER могут отменять приглашения
  return withSchoolManager(organizationId, async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      await db.organizationInvitation.delete({
        where: { id: invitationId },
      })

      revalidatePath(`/school/${organizationId}`)
      return { success: true }
    } catch (error) {
      console.error('Cancel invitation error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// ============================================================================
// Управление членами
// ============================================================================

export type RemoveMemberResult =
  | { success: true }
  | {
      success: false
      error: AuthError | 'CANNOT_REMOVE_SELF' | 'CANNOT_REMOVE_MANAGER' | 'LAST_ADMIN' | 'UNKNOWN_ERROR'
    }

export async function removeMemberAction(organizationId: string, memberId: string): Promise<RemoveMemberResult> {
  // ADMIN или MANAGER могут удалять
  return withSchoolManager(organizationId, async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const targetMembership = await db.member.findUnique({
        where: { id: memberId },
      })

      if (!targetMembership) {
        return { success: false, error: 'UNKNOWN_ERROR' }
      }

      if (targetMembership.userId === user.id) {
        return { success: false, error: 'CANNOT_REMOVE_SELF' }
      }

      // Получаем роль текущего пользователя
      const membership = await db.member.findUnique({
        where: { organizationId_userId: { organizationId: organizationId, userId: user.id } },
      })

      // Менеджер не может удалять менеджеров и админов
      if (
        membership?.role === 'manager' &&
        (targetMembership.role === 'manager' || targetMembership.role === 'owner')
      ) {
        return { success: false, error: 'CANNOT_REMOVE_MANAGER' }
      }

      if (targetMembership.role === 'owner') {
        const adminCount = await db.member.count({
          where: { organizationId: organizationId, role: 'owner' },
        })
        if (adminCount <= 1) {
          return { success: false, error: 'LAST_ADMIN' }
        }
      }

      await db.member.delete({
        where: { id: memberId },
      })

      revalidatePath(`/school/${organizationId}`)
      return { success: true }
    } catch (error) {
      console.error('Remove member error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

export type UpdateMemberRoleResult =
  | { success: true }
  | {
      success: false
      error: AuthError | 'CANNOT_CHANGE_MANAGER_ROLE' | 'LAST_ADMIN' | 'UNKNOWN_ERROR'
    }

export async function updateMemberRoleAction(
  organizationId: string,
  memberId: string,
  newRole: MemberRole
): Promise<UpdateMemberRoleResult> {
  // ADMIN или MANAGER могут менять роли
  const authResult = await requireSchoolManager(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)
    const targetMembership = await db.member.findUnique({
      where: { id: memberId },
    })

    if (!targetMembership) {
      return { success: false, error: 'UNKNOWN_ERROR' }
    }

    // Получаем роль текущего пользователя
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: organizationId, userId: authResult.user.id } },
    })

    // Менеджер не может:
    // 1. Менять роль менеджерам или админам
    // 2. Назначать роль MANAGER
    if (membership?.role === 'manager') {
      if (targetMembership.role === 'manager' || targetMembership.role === 'owner') {
        return { success: false, error: 'CANNOT_CHANGE_MANAGER_ROLE' }
      }
      if (newRole === 'manager') {
        return { success: false, error: 'CANNOT_CHANGE_MANAGER_ROLE' }
      }
    }

    if (targetMembership.role === 'owner' && newRole !== 'owner') {
      const adminCount = await db.member.count({
        where: { organizationId: organizationId, role: 'owner' },
      })
      if (adminCount <= 1) {
        return { success: false, error: 'LAST_ADMIN' }
      }
    }

    await db.member.update({
      where: { id: memberId },
      data: { role: newRole },
    })

    revalidatePath(`/school/${organizationId}`)
    return { success: true }
  } catch (error) {
    console.error('Update member role error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
