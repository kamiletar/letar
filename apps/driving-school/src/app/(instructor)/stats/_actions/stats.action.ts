'use server'

import type { AuthError } from '@/lib/action-helpers'
import { withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { LessonStatus } from '@letar/driving-school-db/prisma'

// === Типы статистики ===

export interface LessonStats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
  rescheduled: number
}

export interface StudentStats {
  total: number
  active: number
  paused: number
  disconnected: number
}

export interface FinanceStats {
  totalPrepaidBalance: number
  totalPenaltiesCharged: number
  totalPenaltiesPaid: number
  pendingPenalties: number
  totalRevenue: number // Общий доход (цены занятий)
}

export interface LessonTypeStats {
  id: string
  name: string
  completedCount: number
  revenue: number
}

export interface DailyLessonData {
  date: string
  completed: number
  cancelled: number
  noShow: number
}

export interface InstructorStats {
  lessons: LessonStats
  students: StudentStats
  finance: FinanceStats
  dailyData: DailyLessonData[]
  lessonTypeStats: LessonTypeStats[]
  period: {
    start: Date
    end: Date
  }
}

export type GetStatsResult =
  | { success: true; stats: InstructorStats }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

export type PeriodType = 'week' | 'month' | 'year' | 'all'

// === Получение статистики инструктора ===

export async function getInstructorStats(period: PeriodType = 'month'): Promise<GetStatsResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      // Определяем период
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0) // С начала времён
          break
      }

      // === Статистика занятий ===
      const lessons = await db.lesson.findMany({
        where: {
          instructorId: user.id,
          createdAt: { gte: startDate },
        },
        select: {
          status: true,
          createdAt: true,
          lessonTypeId: true,
          price: true,
          lessonType: {
            select: {
              id: true,
              name: true,
            },
          },
          slot: {
            select: {
              startTime: true,
            },
          },
        },
      })

      const lessonStats: LessonStats = {
        total: lessons.length,
        pending: lessons.filter((l) => l.status === 'PENDING').length,
        confirmed: lessons.filter((l) => l.status === 'CONFIRMED').length,
        completed: lessons.filter((l) => l.status === 'COMPLETED').length,
        cancelled: lessons.filter((l) => l.status === 'CANCELLED').length,
        noShow: lessons.filter((l) => l.status === 'NO_SHOW').length,
        rescheduled: lessons.filter((l) => l.status === 'RESCHEDULED').length,
      }

      // === Статистика учеников ===
      const connections = await db.studentInstructorConnection.findMany({
        where: {
          instructorId: instructorProfileId,
        },
        select: {
          status: true,
          prepaidLessons: true,
        },
      })

      const studentStats: StudentStats = {
        total: connections.length,
        active: connections.filter((c) => c.status === 'ACTIVE').length,
        paused: connections.filter((c) => c.status === 'PAUSED').length,
        disconnected: connections.filter((c) => c.status === 'DISCONNECTED').length,
      }

      // === Финансовая статистика ===
      const totalPrepaidBalance = connections.reduce((sum, c) => sum + c.prepaidLessons, 0)

      const penalties = await db.penalty.findMany({
        where: {
          instructorId: user.id,
          chargedAt: { gte: startDate },
        },
        select: {
          status: true,
          amount: true,
        },
      })

      // === Статистика по типам занятий ===
      const lessonTypeStatsMap = new Map<string, LessonTypeStats>()
      let totalRevenue = 0

      for (const lesson of lessons) {
        if (lesson.status === 'COMPLETED' && lesson.lessonType) {
          const typeId = lesson.lessonType.id
          // Используем зафиксированную цену занятия (если есть)
          const price = lesson.price ? Number(lesson.price) : 0

          totalRevenue += price

          const existing = lessonTypeStatsMap.get(typeId)
          if (existing) {
            existing.completedCount++
            existing.revenue += price
          } else {
            lessonTypeStatsMap.set(typeId, {
              id: typeId,
              name: lesson.lessonType.name,
              completedCount: 1,
              revenue: price,
            })
          }
        }
      }

      const lessonTypeStats = Array.from(lessonTypeStatsMap.values()).sort((a, b) => b.revenue - a.revenue)

      const financeStats: FinanceStats = {
        totalPrepaidBalance,
        totalPenaltiesCharged: penalties.filter((p) => p.status === 'CHARGED').length,
        totalPenaltiesPaid: penalties.filter((p) => p.status === 'PAID').length,
        pendingPenalties: penalties.filter((p) => p.status === 'CHARGED').length,
        totalRevenue,
      }

      // === Данные по дням (для графика) ===
      const dailyData = generateDailyData(lessons, startDate, now)

      return {
        success: true,
        stats: {
          lessons: lessonStats,
          students: studentStats,
          finance: financeStats,
          dailyData,
          lessonTypeStats,
          period: {
            start: startDate,
            end: now,
          },
        },
      }
    } catch (error) {
      console.error('Ошибка получения статистики:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Экспорт данных в CSV ===

export interface ExportLessonData {
  date: string
  time: string
  student: string | null
  status: string
  notes: string
}

export type ExportResult =
  | { success: true; data: ExportLessonData[]; filename: string }
  | { success: false; error: string }

export async function exportLessonsToCSV(period: PeriodType = 'month'): Promise<ExportResult> {
  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0)
          break
      }

      const lessons = await db.lesson.findMany({
        where: {
          instructorId: user.id,
          createdAt: { gte: startDate },
        },
        include: {
          slot: true,
          student: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          slot: {
            startTime: 'desc',
          },
        },
      })

      const statusLabels: Record<LessonStatus, string> = {
        PENDING: 'Ожидает',
        CONFIRMED: 'Подтверждено',
        COMPLETED: 'Завершено',
        CANCELLED: 'Отменено',
        NO_SHOW: 'Неявка',
        RESCHEDULED: 'Перенесено',
        NEEDS_RESCHEDULE: 'Требует переноса',
      }

      const data: ExportLessonData[] = lessons.map((lesson) => ({
        date: lesson.slot.startTime.toLocaleDateString('ru-RU'),
        time: lesson.slot.startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        student: lesson.student.name || 'Без имени',
        status: statusLabels[lesson.status as LessonStatus] || lesson.status,
        notes: lesson.instructorNotes || '',
      }))

      const periodLabels: Record<PeriodType, string> = {
        week: 'неделя',
        month: 'месяц',
        year: 'год',
        all: 'все',
      }

      const filename = `занятия_${periodLabels[period]}_${now.toISOString().split('T')[0]}.csv`

      return { success: true, data, filename }
    } catch (error) {
      console.error('Ошибка экспорта:', error)
      return { success: false, error: 'Произошла ошибка при экспорте' }
    }
  })
}

// === Вспомогательные функции ===

interface LessonWithSlot {
  status: string
  createdAt: Date
  slot: {
    startTime: Date
  }
}

function generateDailyData(lessons: LessonWithSlot[], startDate: Date, endDate: Date): DailyLessonData[] {
  // Создаём карту дней
  const dailyMap = new Map<string, DailyLessonData>()

  // Инициализируем все дни в периоде
  const current = new Date(startDate)
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0]
    dailyMap.set(dateKey, {
      date: dateKey,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    })
    current.setDate(current.getDate() + 1)
  }

  // Заполняем данными
  for (const lesson of lessons) {
    const dateKey = lesson.slot.startTime.toISOString().split('T')[0]
    const dayData = dailyMap.get(dateKey)

    if (dayData) {
      if (lesson.status === 'COMPLETED') {
        dayData.completed++
      } else if (lesson.status === 'CANCELLED') {
        dayData.cancelled++
      } else if (lesson.status === 'NO_SHOW') {
        dayData.noShow++
      }
    }
  }

  // Возвращаем последние 30 дней максимум
  const result = Array.from(dailyMap.values())
  return result.slice(-30)
}
