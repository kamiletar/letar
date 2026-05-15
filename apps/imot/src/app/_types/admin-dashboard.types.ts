/**
 * ТИПЫ ДЛЯ СТАТИСТИКИ АДМИНИСТРАТОРА
 */
import type { SessionStatus, TransformationStage } from '@/generated/prisma'

export interface AdminDashboardStats {
  // Общая статистика пользователей
  users: {
    total: number
    clients: number
    specialists: number
    admins: number
    recentUsers: Array<{
      id: string
      name: string | null
      email: string
      role: string
      createdAt: Date
    }>
  }

  // Статистика клиентов
  clients: {
    total: number
    withProfiles: {
      numerology: number
      neuroPsych: number
      energy: number
      body: number
      style: number
    }
    averageProfilesPerClient: number
  }

  // Статистика сессий
  sessions: {
    total: number
    byStatus: Record<SessionStatus, number>
    thisMonth: number
    thisWeek: number
  }

  // Статистика планов трансформации
  plans: {
    total: number
    active: number
    completed: number
    byStage: Record<TransformationStage, number>
  }

  // Статистика практик
  practices: {
    total: number
    completed: number
    completionRate: number
  }

  // Активность по специалистам
  specialistActivity: Array<{
    id: string
    name: string | null
    email: string
    clientCount: number
    sessionCount: number
    planCount: number
  }>
}
