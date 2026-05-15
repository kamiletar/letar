import type { UserRole } from '@letar/driving-school-db/prisma'

export type InstructorType = 'freelance' | 'school' | 'hybrid'

/**
 * Определяет тип инструктора на основе ролей и членства в школах
 *
 * @param roles - Роли пользователя (UserRole[])
 * @param memberships - Членства в школах с ролью instructor
 * @returns 'freelance' | 'school' | 'hybrid'
 */
export function getInstructorType(roles: UserRole[], memberships: Array<{ role: string }>): InstructorType {
  const isFreelance = roles.includes('FREELANCE_INSTRUCTOR')
  const hasSchool = memberships.some((m) => m.role === 'instructor')

  if (isFreelance && hasSchool) {
    return 'hybrid'
  }
  if (isFreelance) {
    return 'freelance'
  }
  return 'school'
}
