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
 * Ошибки авторизации
 */
export type AuthError =
  | 'UNAUTHORIZED' // Пользователь не авторизован
  | 'NOT_INSTRUCTOR' // Пользователь не инструктор
  | 'NOT_SCHOOL_ADMIN' // Пользователь не админ школы
  | 'NOT_SCHOOL_MEMBER' // Пользователь не член школы
  | 'NOT_OWNER' // Пользователь не владелец платформы
  | 'NO_PROFILE' // Профиль не найден

/**
 * Результат requireAuth
 */
export type RequireAuthResult = { success: true; user: AuthenticatedUser } | { success: false; error: AuthError }

/**
 * Результат requireInstructor
 */
export type RequireInstructorResult =
  | { success: true; user: AuthenticatedUser; instructorProfileId: string }
  | { success: false; error: AuthError }

/**
 * Результат requireSchoolAdmin
 */
export type RequireSchoolAdminResult = { success: true; user: AuthenticatedUser } | { success: false; error: AuthError }

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Требует авторизацию пользователя.
 * Возвращает данные пользователя или ошибку.
 *
 * @example
 * const authResult = await requireAuth()
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user } = authResult
 */
export async function requireAuth(): Promise<RequireAuthResult> {
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
 * Требует роль инструктора (FREELANCE_INSTRUCTOR или OWNER) и наличие профиля.
 * Возвращает данные пользователя и ID профиля инструктора или ошибку.
 *
 * @example
 * const authResult = await requireInstructor()
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user, instructorProfileId } = authResult
 */
export async function requireInstructor(): Promise<RequireInstructorResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Проверка роли инструктора
  const isInstructor = user.roles.includes('FREELANCE_INSTRUCTOR') || user.roles.includes('OWNER')
  if (!isInstructor) {
    return { success: false, error: 'NOT_INSTRUCTOR' }
  }

  // Получение профиля инструктора
  const instructorProfile = await prisma.instructorProfile.findFirst({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!instructorProfile) {
    return { success: false, error: 'NO_PROFILE' }
  }

  return {
    success: true,
    user,
    instructorProfileId: instructorProfile.id,
  }
}

/**
 * Требует роль администратора школы.
 * Проверяет членство пользователя в школе с ролью ADMIN.
 *
 * @param organizationId - ID школы
 *
 * @example
 * const authResult = await requireSchoolAdmin(organizationId)
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user } = authResult
 */
export async function requireSchoolAdmin(organizationId: string): Promise<RequireSchoolAdminResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем школам
  if (user.roles.includes('OWNER')) {
    return { success: true, user }
  }

  // Проверяем членство в организации с ролью owner
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organizationId,
        userId: user.id,
      },
    },
  })

  if (!membership || membership.role !== 'owner') {
    return { success: false, error: 'NOT_SCHOOL_ADMIN' }
  }

  return { success: true, user }
}

/**
 * Требует роль менеджера школы (ADMIN, SUPER_MANAGER или MANAGER).
 * Проверяет членство пользователя в школе с ролью ADMIN, SUPER_MANAGER или MANAGER.
 *
 * @param organizationId - ID школы
 *
 * @example
 * const authResult = await requireSchoolManager(organizationId)
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user } = authResult
 */
export async function requireSchoolManager(organizationId: string): Promise<RequireSchoolAdminResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем школам
  if (user.roles.includes('OWNER')) {
    return { success: true, user }
  }

  // Проверяем членство в организации с ролью owner, super_manager или manager
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organizationId,
        userId: user.id,
      },
    },
  })

  if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
    return { success: false, error: 'NOT_SCHOOL_ADMIN' }
  }

  return { success: true, user }
}

/**
 * Требует роль супер-менеджера школы (ADMIN или SUPER_MANAGER).
 * SUPER_MANAGER имеет доступ ко всем филиалам школы без явной привязки.
 *
 * @param organizationId - ID школы
 *
 * @example
 * const authResult = await requireSuperManager(organizationId)
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user } = authResult
 */
export async function requireSuperManager(organizationId: string): Promise<RequireSchoolAdminResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем школам
  if (user.roles.includes('OWNER')) {
    return { success: true, user }
  }

  // Проверяем членство в организации с ролью owner или super_manager
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organizationId,
        userId: user.id,
      },
    },
  })

  if (!membership || !['owner', 'super_manager'].includes(membership.role)) {
    return { success: false, error: 'NOT_SCHOOL_ADMIN' }
  }

  return { success: true, user }
}

/**
 * Требует членство в школе (любая роль).
 *
 * @param organizationId - ID школы
 *
 * @example
 * const authResult = await requireSchoolMember(organizationId)
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user } = authResult
 */
export async function requireSchoolMember(organizationId: string): Promise<RequireSchoolAdminResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем школам
  if (user.roles.includes('OWNER')) {
    return { success: true, user }
  }

  // Проверяем членство в организации
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organizationId,
        userId: user.id,
      },
    },
  })

  if (!membership) {
    return { success: false, error: 'NOT_SCHOOL_MEMBER' }
  }

  return { success: true, user }
}

/**
 * Требует роль владельца платформы (OWNER).
 *
 * @example
 * const authResult = await requireOwner()
 * if (!authResult.success) {
 *   return { success: false, error: authResult.error }
 * }
 * const { user } = authResult
 */
export async function requireOwner(): Promise<RequireAuthResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  if (!user.roles.includes('OWNER')) {
    return { success: false, error: 'NOT_OWNER' }
  }

  return { success: true, user }
}

// ============================================================================
// WITH AUTH ОБЁРТКИ
// ============================================================================

/**
 * Стандартный результат action с ошибкой авторизации
 */
export type ActionErrorResult = { success: false; error: AuthError }

/**
 * Обёртка для actions, требующих авторизацию.
 * Автоматически проверяет авторизацию и возвращает ошибку при неудаче.
 *
 * @example
 * export async function myAction(data: Input) {
 *   return withAuth(async (user) => {
 *     // user гарантированно авторизован
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withAuth<T>(fn: (user: AuthenticatedUser) => Promise<T>): Promise<T | ActionErrorResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user)
}

/**
 * Обёртка для actions, требующих роль инструктора.
 *
 * @example
 * export async function myInstructorAction(data: Input) {
 *   return withInstructor(async (user, instructorProfileId) => {
 *     // user — инструктор с профилем
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withInstructor<T>(
  fn: (user: AuthenticatedUser, instructorProfileId: string) => Promise<T>
): Promise<T | ActionErrorResult> {
  const authResult = await requireInstructor()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user, authResult.instructorProfileId)
}

/**
 * Обёртка для actions, требующих роль администратора школы.
 *
 * @example
 * export async function mySchoolAdminAction(organizationId: string, data: Input) {
 *   return withSchoolAdmin(organizationId, async (user) => {
 *     // user — администратор школы
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withSchoolAdmin<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T | ActionErrorResult> {
  const authResult = await requireSchoolAdmin(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user)
}

/**
 * Обёртка для actions, требующих роль менеджера школы.
 *
 * @example
 * export async function mySchoolManagerAction(organizationId: string, data: Input) {
 *   return withSchoolManager(organizationId, async (user) => {
 *     // user — менеджер школы (ADMIN, SUPER_MANAGER или MANAGER)
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withSchoolManager<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T | ActionErrorResult> {
  const authResult = await requireSchoolManager(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user)
}

/**
 * Обёртка для actions, требующих роль супер-менеджера школы.
 *
 * @example
 * export async function mySuperManagerAction(organizationId: string, data: Input) {
 *   return withSuperManager(organizationId, async (user) => {
 *     // user — супер-менеджер школы (ADMIN или SUPER_MANAGER)
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withSuperManager<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T | ActionErrorResult> {
  const authResult = await requireSuperManager(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user)
}

/**
 * Обёртка для actions, требующих членство в школе.
 *
 * @example
 * export async function mySchoolMemberAction(organizationId: string, data: Input) {
 *   return withSchoolMember(organizationId, async (user) => {
 *     // user — член школы
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withSchoolMember<T>(
  organizationId: string,
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T | ActionErrorResult> {
  const authResult = await requireSchoolMember(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user)
}

/**
 * Обёртка для actions, требующих роль владельца платформы.
 *
 * @example
 * export async function myOwnerAction(data: Input) {
 *   return withOwner(async (user) => {
 *     // user — владелец платформы
 *     return { success: true, data: ... }
 *   })
 * }
 */
export async function withOwner<T>(fn: (user: AuthenticatedUser) => Promise<T>): Promise<T | ActionErrorResult> {
  const authResult = await requireOwner()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }
  return fn(authResult.user)
}
