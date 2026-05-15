/**
 * ТИПЫ ДЛЯ АНАЛИТИКИ СПЕЦИАЛИСТА
 */
import type { SessionStatus } from '@/generated/prisma'

export interface SpecialistStats {
  // Общая статистика
  totalClients: number
  activeClients: number // Клиенты с активными планами
  inactiveClients: number

  // Статистика сессий
  totalSessions: number
  scheduledSessions: number
  inProgressSessions: number
  completedSessions: number
  cancelledSessions: number

  // Статистика планов трансформации
  totalPlans: number
  plansByStage: {
    diagnostics: number
    integration: number
    strategy: number
    practice: number
    result: number
  }

  // Недавние клиенты (последние 5)
  recentClients: Array<{
    id: string
    name: string
    email: string
    phone: string | null
    createdAt: Date
    hasNumerology: boolean
    hasNeuroPsych: boolean
    hasEnergy: boolean
    hasBody: boolean
    hasStyle: boolean
  }>

  // Предстоящие сессии (следующие 5)
  upcomingSessions: Array<{
    id: string
    scheduledAt: Date
    duration: number
    status: SessionStatus
    client: {
      id: string
      name: string
    }
  }>
}
