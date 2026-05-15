import { hasAllRoles as hasAllRolesBase, hasAnyRole as hasAnyRoleBase, hasRole as hasRoleBase } from '@letar/api-server'
import type { UserRole } from '@letar/driving-school-db/prisma'

/**
 * Хелперы для работы с ролями пользователей
 *
 * Платформенные роли (UserRole):
 * - USER: базовый пользователь (по умолчанию)
 * - FREELANCE_INSTRUCTOR: независимый инструктор
 * - MODERATOR: модератор контента
 * - OWNER: владелец платформы
 *
 * Организационные роли (Member.role — строковые):
 * - owner: администратор школы
 * - super_manager: супер-менеджер
 * - manager: менеджер школы
 * - instructor: инструктор практики
 * - theory_instructor: преподаватель теории
 * - member: ученик школы
 */

// Тип для проверки membership (совместим с Better Auth Member)
type MembershipLike = { organizationId: string; role: string }

// ============================================================================
// БАЗОВЫЕ ПРОВЕРКИ ПЛАТФОРМЕННЫХ РОЛЕЙ
// ============================================================================

/**
 * Проверяет, имеет ли пользователь указанную роль
 */
export function hasRole(roles: UserRole[] | undefined | null, role: UserRole): boolean {
  return hasRoleBase(roles, role)
}

/**
 * Проверяет, имеет ли пользователь хотя бы одну из указанных ролей
 */
export function hasAnyRole(roles: UserRole[] | undefined | null, requiredRoles: UserRole[]): boolean {
  return hasAnyRoleBase(roles, requiredRoles)
}

/**
 * Проверяет, имеет ли пользователь все указанные роли
 */
export function hasAllRoles(roles: UserRole[] | undefined | null, requiredRoles: UserRole[]): boolean {
  return hasAllRolesBase(roles, requiredRoles)
}

// ============================================================================
// ПРОВЕРКИ ПЛАТФОРМЕННЫХ РОЛЕЙ
// ============================================================================

/**
 * Проверяет, является ли пользователь базовым пользователем
 */
export function isUser(roles: UserRole[] | undefined | null): boolean {
  return hasRole(roles, 'USER')
}

/**
 * Проверяет, является ли пользователь независимым инструктором
 */
export function isFreelanceInstructor(roles: UserRole[] | undefined | null): boolean {
  return hasRole(roles, 'FREELANCE_INSTRUCTOR')
}

/**
 * Проверяет, является ли пользователь модератором
 */
export function isModerator(roles: UserRole[] | undefined | null): boolean {
  return hasRole(roles, 'MODERATOR')
}

/**
 * Проверяет, является ли пользователь владельцем платформы
 */
export function isOwner(roles: UserRole[] | undefined | null): boolean {
  return hasRole(roles, 'OWNER')
}

// ============================================================================
// ПРОВЕРКИ ШКОЛЬНЫХ РОЛЕЙ (ОРГАНИЗАЦИЙ)
// ============================================================================

/**
 * Проверяет, является ли пользователь владельцем школы (owner)
 */
export function isSchoolAdmin(memberships: MembershipLike[] | undefined | null, organizationId: string): boolean {
  return memberships?.some((m) => m.organizationId === organizationId && m.role === 'owner') ?? false
}

/**
 * Проверяет, является ли пользователь менеджером школы (owner, super_manager или manager)
 */
export function isSchoolManager(memberships: MembershipLike[] | undefined | null, organizationId: string): boolean {
  return (
    memberships?.some(
      (m) => m.organizationId === organizationId && ['owner', 'super_manager', 'manager'].includes(m.role)
    ) ?? false
  )
}

/**
 * Проверяет, является ли пользователь инструктором школы
 */
export function isSchoolInstructor(memberships: MembershipLike[] | undefined | null, organizationId: string): boolean {
  return memberships?.some((m) => m.organizationId === organizationId && m.role === 'instructor') ?? false
}

/**
 * Проверяет, является ли пользователь преподавателем теории в школе
 */
export function isSchoolTheoryInstructor(
  memberships: MembershipLike[] | undefined | null,
  organizationId: string
): boolean {
  return memberships?.some((m) => m.organizationId === organizationId && m.role === 'theory_instructor') ?? false
}

/**
 * Проверяет, является ли пользователь учеником школы
 */
export function isSchoolStudent(memberships: MembershipLike[] | undefined | null, organizationId: string): boolean {
  return memberships?.some((m) => m.organizationId === organizationId && m.role === 'member') ?? false
}

/**
 * Проверяет, является ли пользователь членом школы с любой ролью
 */
export function isSchoolMember(memberships: MembershipLike[] | undefined | null, organizationId: string): boolean {
  return memberships?.some((m) => m.organizationId === organizationId) ?? false
}

/**
 * Получает роль пользователя в школе
 */
export function getSchoolRole(memberships: MembershipLike[] | undefined | null, organizationId: string): string | null {
  const membership = memberships?.find((m) => m.organizationId === organizationId)
  return membership?.role ?? null
}

/**
 * Проверяет, имеет ли пользователь любую из указанных ролей в школе
 */
export function hasSchoolRole(
  memberships: MembershipLike[] | undefined | null,
  organizationId: string,
  roles: string[]
): boolean {
  return memberships?.some((m) => m.organizationId === organizationId && roles.includes(m.role)) ?? false
}

// ============================================================================
// КОМБИНИРОВАННЫЕ ПРОВЕРКИ
// ============================================================================

/**
 * Проверяет, может ли пользователь управлять расписанием
 * (независимый инструктор или владелец)
 */
export function canManageSchedule(roles: UserRole[] | undefined | null): boolean {
  return hasAnyRole(roles, ['FREELANCE_INSTRUCTOR', 'OWNER'])
}

/**
 * Проверяет, может ли пользователь модерировать контент
 * (модератор или владелец)
 */
export function canModerate(roles: UserRole[] | undefined | null): boolean {
  return hasAnyRole(roles, ['MODERATOR', 'OWNER'])
}

/**
 * Проверяет, может ли пользователь действовать как инструктор
 * (независимый инструктор, модератор или владелец)
 */
export function canActAsInstructor(roles: UserRole[] | undefined | null): boolean {
  return hasAnyRole(roles, ['FREELANCE_INSTRUCTOR', 'OWNER'])
}

/**
 * Проверяет, может ли пользователь управлять школой
 * (владелец платформы имеет доступ ко всем школам)
 */
export function canManageSchool(
  roles: UserRole[] | undefined | null,
  memberships: MembershipLike[] | undefined | null,
  organizationId: string
): boolean {
  if (isOwner(roles)) {
    return true
  }
  return isSchoolManager(memberships, organizationId)
}

// ============================================================================
// АЛИАС ДЛЯ УДОБСТВА
// ============================================================================

/**
 * Проверяет, является ли пользователь инструктором (алиас isFreelanceInstructor)
 */
export function isInstructor(roles: UserRole[] | undefined | null): boolean {
  return isFreelanceInstructor(roles)
}
