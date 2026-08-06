/**
 * Role Utilities
 *
 * Универсальные функции для работы с ролями.
 * Типизированы через generics для любых систем ролей.
 */

/**
 * Проверяет, имеет ли пользователь указанную роль
 */
export function hasRole<T extends string>(roles: T[] | undefined | null, role: T): boolean {
  return roles?.includes(role) ?? false
}

/**
 * Проверяет, имеет ли пользователь хотя бы одну из указанных ролей
 */
export function hasAnyRole<T extends string>(roles: T[] | undefined | null, requiredRoles: T[]): boolean {
  if (!roles) {
    return false
  }
  return requiredRoles.some((role) => roles.includes(role))
}

/**
 * Проверяет, имеет ли пользователь все указанные роли
 */
export function hasAllRoles<T extends string>(roles: T[] | undefined | null, requiredRoles: T[]): boolean {
  if (!roles) {
    return false
  }
  return requiredRoles.every((role) => roles.includes(role))
}

/**
 * Тип для функции проверки роли
 */
export type RoleChecker<T extends string> = (roles: T[] | undefined | null) => boolean

/**
 * Создаёт функцию проверки конкретной роли
 */
export function createRoleChecker<T extends string>(role: T): RoleChecker<T> {
  return (roles) => hasRole(roles, role)
}

/**
 * Интерфейс membership с ключом и ролью
 */
export interface MembershipLike<TRole extends string = string> {
  [key: string]: unknown
  role: TRole
}

/**
 * Тип для функции проверки membership
 */
export type MembershipChecker<TMembership extends MembershipLike, TRole extends string = string> = (
  memberships: TMembership[] | undefined | null,
  keyValue: string,
  roles?: TRole[],
) => boolean

/**
 * Создаёт функции для проверки membership
 */
export function createMembershipChecker<
  TMembership extends { [key: string]: unknown; role: TRole },
  TRole extends string = string,
>(
  keyName: string,
): {
  isMember: (memberships: TMembership[] | undefined | null, keyValue: string) => boolean
  hasRole: (memberships: TMembership[] | undefined | null, keyValue: string, role: TRole) => boolean
  hasAnyRole: (memberships: TMembership[] | undefined | null, keyValue: string, roles: TRole[]) => boolean
  getRole: (memberships: TMembership[] | undefined | null, keyValue: string) => TRole | null
} {
  return {
    isMember: (memberships, keyValue) => {
      return memberships?.some((m) => m[keyName] === keyValue) ?? false
    },

    hasRole: (memberships, keyValue, role) => {
      return memberships?.some((m) => m[keyName] === keyValue && m.role === role) ?? false
    },

    hasAnyRole: (memberships, keyValue, roles) => {
      return memberships?.some((m) => m[keyName] === keyValue && roles.includes(m.role)) ?? false
    },

    getRole: (memberships, keyValue) => {
      const membership = memberships?.find((m) => m[keyName] === keyValue)
      return (membership?.role as TRole) ?? null
    },
  }
}
