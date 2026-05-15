'use server'

/**
 * Server Actions для управления организациями (Better Auth)
 *
 * Этот файл заменит school-management.action.ts после миграции.
 * На время миграции оба файла существуют параллельно.
 *
 * Примечание: Используем прямые Prisma операции вместо Better Auth API,
 * т.к. серверный API организаций требует HTTP context.
 * Авторизация проверяется через organization-helpers.
 */

import { getEnhancedPrisma, prisma } from '@/lib/db'
import {
  canManageRole,
  getInvitableRoles,
  type OrganizationRole,
  type OrgAuthError,
  requireOrganizationManager,
  requireOrganizationMember,
  roleLabels,
  withOrganizationManager,
} from '@/lib/organization-helpers'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Типы
// ============================================================================

export interface OrganizationDetails {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  isPublic: boolean
  averageRating: number | null
  reviewCount: number
  // Массивы из metadata
  cities: string[]
  licenseCategories: LicenseCategory[]
  createdAt: Date
}

export interface OrganizationMember {
  id: string
  userId: string
  role: OrganizationRole
  roleLabel: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface OrganizationInvitation {
  id: string
  email: string
  role: OrganizationRole
  roleLabel: string
  status: string
  expiresAt: Date
  createdAt: Date
  teamId: string | null
}

// ============================================================================
// Получение данных организации
// ============================================================================

export type GetOrganizationResult =
  | {
      success: true
      organization: OrganizationDetails
      members: OrganizationMember[]
      invitations: OrganizationInvitation[]
      currentRole: OrganizationRole
      isOwner: boolean
      isManager: boolean
      canManage: boolean
      invitableRoles: OrganizationRole[]
    }
  | { success: false; error: OrgAuthError | 'ORGANIZATION_NOT_FOUND' }

/**
 * Получить детали организации
 */
export async function getOrganizationDetails(organizationId: string): Promise<GetOrganizationResult> {
  const authResult = await requireOrganizationMember(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  // ZenStack v3 баг: include с nested relations генерирует невалидный SQL (42P01)
  // Используем prisma напрямую, доступ уже проверен через requireOrganizationMember
  const org = await prisma.organization.findUnique({
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
        orderBy: { createdAt: 'asc' },
      },
      invitations: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!org) {
    return { success: false, error: 'ORGANIZATION_NOT_FOUND' }
  }

  // Парсим metadata для получения массивов
  let cities: string[] = []
  let licenseCategories: LicenseCategory[] = []

  if (org.metadata) {
    try {
      const meta = JSON.parse(org.metadata)
      cities = meta.cities || []
      licenseCategories = meta.licenseCategories || []
    } catch {
      // Игнорируем ошибки парсинга
    }
  }

  const isOwner = authResult.role === 'owner'
  const isManager = ['owner', 'super_manager', 'manager'].includes(authResult.role)
  const canManage = isManager

  return {
    success: true,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      description: org.description,
      phone: org.phone,
      email: org.email,
      website: org.website,
      isPublic: org.isPublic,
      averageRating: org.averageRating,
      reviewCount: org.reviewCount,
      cities,
      licenseCategories,
      createdAt: org.createdAt,
    },
    members: org.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role as OrganizationRole,
      roleLabel: roleLabels[m.role as OrganizationRole] || m.role,
      createdAt: m.createdAt,
      user: m.user,
    })),
    invitations: org.invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role as OrganizationRole,
      roleLabel: roleLabels[i.role as OrganizationRole] || i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      teamId: i.teamId,
    })),
    currentRole: authResult.role,
    isOwner,
    isManager,
    canManage,
    invitableRoles: getInvitableRoles(authResult.role),
  }
}

// ============================================================================
// Приглашения через Better Auth API
// ============================================================================

export type CreateOrgInvitationResult =
  | { success: true; invitationId: string }
  | { success: false; error: OrgAuthError | 'CANNOT_INVITE_HIGHER_ROLE' | 'UNKNOWN_ERROR' }

/**
 * Создать приглашение в организацию через Better Auth API
 */
export async function createOrgInvitationAction(
  organizationId: string,
  data: { email: string; role: OrganizationRole; teamId?: string }
): Promise<CreateOrgInvitationResult> {
  const authResult = await requireOrganizationManager(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  // Проверяем, может ли текущая роль приглашать целевую роль
  if (!canManageRole(authResult.role, data.role)) {
    return { success: false, error: 'CANNOT_INVITE_HIGHER_ROLE' }
  }

  try {
    // Создаём приглашение через Prisma
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 дней на принятие

    const invitation = await prisma.organizationInvitation.create({
      data: {
        email: data.email,
        role: data.role,
        status: 'pending',
        organizationId,
        inviterId: authResult.user.id,
        teamId: data.teamId,
        expiresAt,
      },
    })

    revalidatePath(`/school/${organizationId}`)
    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('Create organization invitation error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

export type CancelOrgInvitationResult = { success: true } | { success: false; error: OrgAuthError | 'UNKNOWN_ERROR' }

/**
 * Отменить приглашение через Better Auth API
 */
export async function cancelOrgInvitationAction(
  organizationId: string,
  invitationId: string
): Promise<CancelOrgInvitationResult> {
  return withOrganizationManager(organizationId, async () => {
    try {
      // Отменяем приглашение через Prisma
      await prisma.organizationInvitation.update({
        where: { id: invitationId },
        data: { status: 'canceled' },
      })

      revalidatePath(`/school/${organizationId}`)
      return { success: true }
    } catch (error) {
      console.error('Cancel organization invitation error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// ============================================================================
// Управление членами через Prisma
// ============================================================================

export type RemoveOrgMemberResult =
  | { success: true }
  | {
      success: false
      error: OrgAuthError | 'CANNOT_REMOVE_SELF' | 'CANNOT_REMOVE_HIGHER_ROLE' | 'LAST_OWNER' | 'UNKNOWN_ERROR'
    }

/**
 * Удалить члена из организации
 */
export async function removeOrgMemberAction(organizationId: string, memberId: string): Promise<RemoveOrgMemberResult> {
  const authResult = await requireOrganizationManager(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)
    const targetMember = await db.member.findUnique({
      where: { id: memberId },
    })

    if (!targetMember) {
      return { success: false, error: 'UNKNOWN_ERROR' }
    }

    // Нельзя удалить себя
    if (targetMember.userId === authResult.user.id) {
      return { success: false, error: 'CANNOT_REMOVE_SELF' }
    }

    // Нельзя удалить члена с более высокой ролью
    if (!canManageRole(authResult.role, targetMember.role as OrganizationRole)) {
      return { success: false, error: 'CANNOT_REMOVE_HIGHER_ROLE' }
    }

    // Нельзя удалить последнего owner
    if (targetMember.role === 'owner') {
      const ownerCount = await db.member.count({
        where: { organizationId, role: 'owner' },
      })
      if (ownerCount <= 1) {
        return { success: false, error: 'LAST_OWNER' }
      }
    }

    // Удаляем члена через Prisma (включая связи с командами)
    await prisma.$transaction([
      prisma.teamMember.deleteMany({
        where: { memberId },
      }),
      prisma.member.delete({
        where: { id: memberId },
      }),
    ])

    revalidatePath(`/school/${organizationId}`)
    return { success: true }
  } catch (error) {
    console.error('Remove organization member error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

export type UpdateOrgMemberRoleResult =
  | { success: true }
  | {
      success: false
      error: OrgAuthError | 'CANNOT_CHANGE_HIGHER_ROLE' | 'LAST_OWNER' | 'UNKNOWN_ERROR'
    }

/**
 * Изменить роль члена организации
 */
export async function updateOrgMemberRoleAction(
  organizationId: string,
  memberId: string,
  newRole: OrganizationRole
): Promise<UpdateOrgMemberRoleResult> {
  const authResult = await requireOrganizationManager(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)
    const targetMember = await db.member.findUnique({
      where: { id: memberId },
    })

    if (!targetMember) {
      return { success: false, error: 'UNKNOWN_ERROR' }
    }

    // Нельзя менять роль члену с более высокой ролью
    if (!canManageRole(authResult.role, targetMember.role as OrganizationRole)) {
      return { success: false, error: 'CANNOT_CHANGE_HIGHER_ROLE' }
    }

    // Нельзя назначить роль выше своей
    if (!canManageRole(authResult.role, newRole) && newRole !== authResult.role) {
      return { success: false, error: 'CANNOT_CHANGE_HIGHER_ROLE' }
    }

    // Нельзя понизить последнего owner
    if (targetMember.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await db.member.count({
        where: { organizationId, role: 'owner' },
      })
      if (ownerCount <= 1) {
        return { success: false, error: 'LAST_OWNER' }
      }
    }

    // Обновляем роль через Prisma
    await prisma.member.update({
      where: { id: memberId },
      data: { role: newRole },
    })

    revalidatePath(`/school/${organizationId}`)
    return { success: true }
  } catch (error) {
    console.error('Update organization member role error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// Управление командами (филиалами) через Prisma
// ============================================================================

export type CreateTeamResult =
  | { success: true; teamId: string }
  | { success: false; error: OrgAuthError | 'UNKNOWN_ERROR' }

/**
 * Создать команду (филиал)
 */
export async function createTeamAction(organizationId: string, data: { name: string }): Promise<CreateTeamResult> {
  return withOrganizationManager(organizationId, async () => {
    try {
      const team = await prisma.team.create({
        data: {
          name: data.name,
          organizationId,
        },
      })

      revalidatePath(`/school/${organizationId}`)
      return { success: true, teamId: team.id }
    } catch (error) {
      console.error('Create team error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

export type AddTeamMemberResult = { success: true } | { success: false; error: OrgAuthError | 'UNKNOWN_ERROR' }

/**
 * Добавить члена в команду
 */
export async function addTeamMemberAction(
  organizationId: string,
  teamId: string,
  userId: string
): Promise<AddTeamMemberResult> {
  return withOrganizationManager(organizationId, async () => {
    try {
      // Находим member по userId в организации
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: { organizationId, userId },
        },
      })

      if (!member) {
        return { success: false, error: 'UNKNOWN_ERROR' }
      }

      await prisma.teamMember.create({
        data: {
          teamId,
          userId,
          memberId: member.id,
        },
      })

      revalidatePath(`/school/${organizationId}`)
      return { success: true }
    } catch (error) {
      console.error('Add team member error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

export type RemoveTeamMemberResult = { success: true } | { success: false; error: OrgAuthError | 'UNKNOWN_ERROR' }

/**
 * Удалить члена из команды
 */
export async function removeTeamMemberAction(
  organizationId: string,
  teamId: string,
  userId: string
): Promise<RemoveTeamMemberResult> {
  return withOrganizationManager(organizationId, async () => {
    try {
      await prisma.teamMember.deleteMany({
        where: { teamId, userId },
      })

      revalidatePath(`/school/${organizationId}`)
      return { success: true }
    } catch (error) {
      console.error('Remove team member error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}
