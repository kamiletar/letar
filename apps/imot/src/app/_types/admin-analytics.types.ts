/**
 * ТИПЫ ДЛЯ АНАЛИТИКИ АДМИНИСТРАТОРА
 */
import type { UserRole } from '@/generated/prisma'

export interface AdminStats {
  // Общая статистика пользователей
  totalUsers: number
  usersByRole: {
    client: number
    specialist: number
    admin: number
  }

  // Статистика клиентов
  totalClients: number
  activeClients: number

  // Статистика специалистов
  totalSpecialists: number
  activeSpecialists: number // Специалисты с клиентами

  // Статистика сессий
  totalSessions: number
  sessionsByStatus: {
    scheduled: number
    inProgress: number
    completed: number
    cancelled: number
  }

  // Статистика планов трансформации
  totalPlans: number
  plansByStage: {
    diagnostics: number
    integration: number
    strategy: number
    practice: number
    result: number
  }

  // Активность специалистов (топ 5 по количеству клиентов)
  topSpecialists: Array<{
    id: string
    name: string
    email: string
    clientCount: number
    sessionCount: number
  }>

  // Недавно зарегистрированные пользователи (последние 5)
  recentUsers: Array<{
    id: string
    name: string
    email: string
    role: UserRole
    createdAt: Date
  }>
}
