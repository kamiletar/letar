/**
 * Утилиты для работы с сессией Better Auth.
 * Централизует извлечение ролей без unsafe кастов.
 */

/** Извлечь массив ролей из объекта пользователя сессии */
export function getUserRoles(user: unknown): string[] {
  if (!user || typeof user !== 'object') {
    return []
  }
  const roles = (user as Record<string, unknown>).roles
  if (Array.isArray(roles)) {
    return roles as string[]
  }
  return []
}

/** Проверить, является ли пользователь админом */
export function isUserAdmin(user: unknown): boolean {
  return getUserRoles(user).includes('ADMIN')
}
