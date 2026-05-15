/**
 * Хелперы для работы с Better Auth Organizations
 *
 * Этот файл содержит функции для проверки ролей и прав доступа в организациях.
 * Использует новую модель Member вместо SchoolMembership.
 *
 * Маппинг ролей:
 * - owner — ADMIN (полный доступ)
 * - super_manager — доступ ко всем филиалам
 * - manager — управление в пределах филиалов
 * - instructor — проведение практических занятий
 * - theory_instructor — проведение теории
 * - member — ученик (базовый доступ)
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { UserRole } from '@letar/driving-school-db/prisma'

// ============================================================================
// ТИПЫ
// ============================================================================

/**
 * Аутентифицированный пользователь из сессии
 */
export interface AuthenticatedUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  roles: UserRole[]
  isOnboardingComplete: boolean
  hasStudentProfile: boolean
  hasInstructorProfile: boolean
}

/**
 * Роли организации (Better Auth)
 */
export type OrganizationRole = 'owner' | 'super_manager' | 'manager' | 'instructor' | 'theory_instructor' | 'member'

/**
 * Ошибки авторизации
 */
export type OrgAuthError =
  | 'UNAUTHORIZED' // Пользователь не авторизован
  | 'NOT_ORG_OWNER' // Пользователь не владелец организации
  | 'NOT_ORG_MANAGER' // Пользователь не менеджер организации
  | 'NOT_ORG_MEMBER' // Пользователь не член организации
  | 'NOT_PLATFORM_OWNER' // Пользователь не владелец платформы
  | 'ORGANIZATION_NOT_FOUND' // Организация не найдена

/**
 * Результат проверки членства в организации
 */
export type OrgMemberResult =
  | { success: true; user: AuthenticatedUser; role: OrganizationRole; memberId: string }
  | { success: false; error: OrgAuthError }

/**
 * Результат проверки базовой авторизации
 */
export type OrgAuthResult = { success: true; user: AuthenticatedUser } | { success: false; error: OrgAuthError }

// ============================================================================
// ХЕЛПЕРЫ АВТОРИЗАЦИИ
// ============================================================================

/**
 * Требует авторизацию пользователя.
 */
async function requireAuth(): Promise<OrgAuthResult> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      roles: session.user.roles ?? [],
      isOnboardingComplete: session.user.isOnboardingComplete ?? false,
      hasStudentProfile: session.user.hasStudentProfile ?? false,
      hasInstructorProfile: session.user.hasInstructorProfile ?? false,
    },
  }
}

/**
 * Получает членство пользователя в организации
 */
async function getOrganizationMembership(
  organizationId: string,
  userId: string
): Promise<{ role: OrganizationRole; memberId: string } | null> {
  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (!member) {
    return null
  }

  return {
    role: member.role as OrganizationRole,
    memberId: member.id,
  }
}

// ============================================================================
// REQUIRE ФУНКЦИИ
// ============================================================================

/**
 * Требует роль владельца организации (owner).
 *
 * @param organizationId - ID организации
 *
 * @example
 * const result = await requireOrganizationOwner(orgId)
 * if (!result.success) {
 *   return { success: false, error: result.error }
 * }
 * const { user, memberId } = result
 */
export async function requireOrganizationOwner(organizationId: string): Promise<OrgMemberResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем организациям
  if (user.roles.includes('OWNER')) {
    return {
      success: true,
      user,
      role: 'owner',
      memberId: 'platform-owner',
    }
  }

  const membership = await getOrganizationMembership(organizationId, user.id)

  if (!membership || membership.role !== 'owner') {
    return { success: false, error: 'NOT_ORG_OWNER' }
  }

  return {
    success: true,
    user,
    role: membership.role,
    memberId: membership.memberId,
  }
}

/**
 * Требует роль супер-менеджера организации (owner или super_manager).
 * Супер-менеджеры имеют доступ ко всем филиалам без явной привязки.
 *
 * @param organizationId - ID организации
 */
export async function requireOrganizationSuperManager(organizationId: string): Promise<OrgMemberResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем организациям
  if (user.roles.includes('OWNER')) {
    return {
      success: true,
      user,
      role: 'owner',
      memberId: 'platform-owner',
    }
  }

  const membership = await getOrganizationMembership(organizationId, user.id)

  if (!membership || !['owner', 'super_manager'].includes(membership.role)) {
    return { success: false, error: 'NOT_ORG_MANAGER' }
  }

  return {
    success: true,
    user,
    role: membership.role,
    memberId: membership.memberId,
  }
}

/**
 * Требует роль менеджера организации (owner, super_manager или manager).
 *
 * @param organizationId - ID организации
 */
export async function requireOrganizationManager(organizationId: string): Promise<OrgMemberResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем организациям
  if (user.roles.includes('OWNER')) {
    return {
      success: true,
      user,
      role: 'owner',
      memberId: 'platform-owner',
    }
  }

  const membership = await getOrganizationMembership(organizationId, user.id)

  if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
    return { success: false, error: 'NOT_ORG_MANAGER' }
  }

  return {
    success: true,
    user,
    role: membership.role,
    memberId: membership.memberId,
  }
}

/**
 * Требует членство в организации (любая роль).
 *
 * @param organizationId - ID организации
 */
export async function requireOrganizationMember(organizationId: string): Promise<OrgMemberResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем организациям
  if (user.roles.includes('OWNER')) {
    return {
      success: true,
      user,
      role: 'owner',
      memberId: 'platform-owner',
    }
  }

  const membership = await getOrganizationMembership(organizationId, user.id)

  if (!membership) {
    return { success: false, error: 'NOT_ORG_MEMBER' }
  }

  return {
    success: true,
    user,
    role: membership.role,
    memberId: membership.memberId,
  }
}

/**
 * Требует роль инструктора в организации.
 *
 * @param organizationId - ID организации
 */
export async function requireOrganizationInstructor(organizationId: string): Promise<OrgMemberResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем организациям
  if (user.roles.includes('OWNER')) {
    return {
      success: true,
      user,
      role: 'owner',
      memberId: 'platform-owner',
    }
  }

  const membership = await getOrganizationMembership(organizationId, user.id)

  if (!membership || !['owner', 'super_manager', 'manager', 'instructor'].includes(membership.role)) {
    return { success: false, error: 'NOT_ORG_MEMBER' }
  }

  return {
    success: true,
    user,
    role: membership.role,
    memberId: membership.memberId,
  }
}

// ============================================================================
// WITH ОБЁРТКИ
// ============================================================================

/**
 * Стандартный результат action с ошибкой авторизации
 */
export type OrgActionErrorResult = { success: false; error: OrgAuthError }

/**
 * Обёртка для actions, требующих роль владельца организации.
 */
export async function withOrganizationOwner<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser, memberId: string) => Promise<T>
): Promise<T | OrgActionErrorResult> {
  const result = await requireOrganizationOwner(organizationId)
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return fn(result.user, result.memberId)
}

/**
 * Обёртка для actions, требующих роль супер-менеджера организации.
 */
export async function withOrganizationSuperManager<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser, memberId: string, role: OrganizationRole) => Promise<T>
): Promise<T | OrgActionErrorResult> {
  const result = await requireOrganizationSuperManager(organizationId)
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return fn(result.user, result.memberId, result.role)
}

/**
 * Обёртка для actions, требующих роль менеджера организации.
 */
export async function withOrganizationManager<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser, memberId: string, role: OrganizationRole) => Promise<T>
): Promise<T | OrgActionErrorResult> {
  const result = await requireOrganizationManager(organizationId)
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return fn(result.user, result.memberId, result.role)
}

/**
 * Обёртка для actions, требующих членство в организации.
 */
export async function withOrganizationMember<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser, memberId: string, role: OrganizationRole) => Promise<T>
): Promise<T | OrgActionErrorResult> {
  const result = await requireOrganizationMember(organizationId)
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return fn(result.user, result.memberId, result.role)
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Проверяет, может ли роль A управлять ролью B
 * (роль A выше в иерархии чем роль B)
 */
const roleHierarchy: Record<OrganizationRole, number> = {
  owner: 0,
  super_manager: 1,
  manager: 2,
  instructor: 3,
  theory_instructor: 3,
  member: 4,
}

export function canManageRole(managerRole: OrganizationRole, targetRole: OrganizationRole): boolean {
  return roleHierarchy[managerRole] < roleHierarchy[targetRole]
}

/**
 * Получить роли, которые может приглашать данная роль
 */
export function getInvitableRoles(role: OrganizationRole): OrganizationRole[] {
  const level = roleHierarchy[role]
  return (Object.entries(roleHierarchy) as [OrganizationRole, number][]).filter(([_, l]) => l > level).map(([r]) => r)
}

/**
 * Названия ролей для UI
 */
export const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Администратор',
  super_manager: 'Супер-менеджер',
  manager: 'Менеджер',
  instructor: 'Инструктор',
  theory_instructor: 'Преподаватель теории',
  member: 'Ученик',
}

/**
 * Цвета ролей для UI (Chakra colorPalette)
 */
export const roleColors: Record<OrganizationRole, string> = {
  owner: 'red',
  super_manager: 'orange',
  manager: 'yellow',
  instructor: 'blue',
  theory_instructor: 'purple',
  member: 'green',
}
