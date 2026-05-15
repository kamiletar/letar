'use server'

/**
 * Server Actions для Manager Dashboard
 *
 * Получение данных для:
 * - TodaySection (занятия, экзамены, платежи сегодня)
 * - NeedsAttentionWidget (проблемы по категориям)
 *
 * @module dashboard.action
 */

import { getEnhancedPrisma } from '@/lib/db'
import { type OrgAuthError, requireOrganizationManager } from '@/lib/organization-helpers'
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns'

// ============================================================================
// Типы
// ============================================================================

export interface TodaySectionData {
  /** Занятия сегодня */
  lessons: {
    total: number
    completed: number
    cancelled: number
    upcoming: number
  }
  /** Экзамены сегодня */
  exams: {
    total: number
    internal: number
    gibdd: number
  }
  /** Платежи сегодня */
  payments: {
    amount: number
    studentsCount: number
  }
}

export interface NeedsAttentionData {
  /** Проблемы с документами */
  documents: {
    expiringSoon: number
    pendingReview: number
  }
  /** Финансовые проблемы */
  finances: {
    overduePayments: number
    overdueAmount: number
  }
  /** Проблемы с обучением */
  training: {
    inactiveStudents: number
    readyForExam: number
  }
}

export interface DashboardData {
  today: TodaySectionData
  needsAttention: NeedsAttentionData
  /** KPI метрики для карточек */
  kpi: {
    activeStudents: number
    lessonsThisWeek: number
    revenueThisMonth: number
    passRate: number
  }
}

export type GetDashboardDataResult = { success: true; data: DashboardData } | { success: false; error: OrgAuthError }

// ============================================================================
// Получение данных дашборда
// ============================================================================

/**
 * Получить данные для Manager Dashboard
 */
export async function getDashboardDataAction(organizationId: string): Promise<GetDashboardDataResult> {
  const authResult = await requireOrganizationManager(organizationId)

  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const db = getEnhancedPrisma(authResult.user)

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekAgo = subDays(now, 7)
  const monthAgo = subDays(now, 30)

  // === Получаем прогрессы учеников школы ===
  const studentProgresses = await db.studentProgress.findMany({
    where: { organizationId },
    select: {
      id: true,
      status: true,
      theoryStatus: true,
      courseEnrollments: {
        select: {
          id: true,
          totalPrice: true,
          paidAmount: true,
        },
      },
      categoryProgress: {
        select: {
          practiceStatus: true,
        },
      },
    },
  })

  const progressIds = studentProgresses.map((p) => p.id)

  // === Занятия сегодня (через TimeSlot) ===
  const todayLessons = await db.lesson.findMany({
    where: {
      courseEnrollment: {
        progressId: { in: progressIds },
      },
      slot: {
        startTime: { gte: todayStart, lte: todayEnd },
      },
    },
    select: {
      id: true,
      status: true,
      price: true,
    },
  })

  const lessonsTotal = todayLessons.length
  const lessonsCompleted = todayLessons.filter((l) => l.status === 'COMPLETED').length
  const lessonsCancelled = todayLessons.filter((l) => l.status === 'CANCELLED').length
  const lessonsUpcoming = lessonsTotal - lessonsCompleted - lessonsCancelled

  // === Экзамены сегодня ===
  const todayExams = await db.examSession.findMany({
    where: {
      organizationId,
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: 'SCHEDULED',
    },
    select: {
      id: true,
      type: true,
    },
  })

  const examsTotal = todayExams.length
  const examsInternal = todayExams.filter((e) => e.type === 'INTERNAL_THEORY' || e.type === 'INTERNAL_PRACTICE').length
  const examsGibdd = todayExams.filter(
    (e) => e.type === 'GIBDD_THEORY' || e.type === 'GIBDD_PRACTICE_AREA' || e.type === 'GIBDD_PRACTICE_CITY'
  ).length

  // === Документы (v0.208.0) ===
  const thirtyDaysFromNow = addDays(now, 30)

  // Истекающие в ближайшие 30 дней (не истёкшие)
  const expiringSoonDocs = await db.studentDocument.count({
    where: {
      progressId: { in: progressIds },
      status: { not: 'EXPIRED' },
      expiresAt: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
  })

  // Ожидающие проверки (статус UPLOADED)
  const pendingReviewDocs = await db.studentDocument.count({
    where: {
      progressId: { in: progressIds },
      status: 'UPLOADED',
    },
  })

  // === Платежи сегодня (стоимость занятий) ===
  const todayPaymentAmount = todayLessons
    .filter((l) => l.status !== 'CANCELLED')
    .reduce((sum, lesson) => sum + (lesson.price ? Number(lesson.price) : 0), 0)

  const todayStudentsCount = new Set(todayLessons.filter((l) => l.status !== 'CANCELLED').map((l) => l.id)).size

  // === Финансы (неоплаченные курсы) ===
  let overduePayments = 0
  let overdueAmount = 0

  for (const progress of studentProgresses) {
    for (const enrollment of progress.courseEnrollments) {
      const remaining = Number(enrollment.totalPrice) - Number(enrollment.paidAmount)
      if (remaining > 0) {
        overduePayments++
        overdueAmount += remaining
      }
    }
  }

  // === Неактивные ученики (теория не начата, практика не начата) ===
  const inactiveStudents = studentProgresses.filter((p) => {
    if (p.status !== 'ACTIVE') {
      return false
    }
    // Проверяем, что нет активности в обучении
    const hasTheoryProgress = p.theoryStatus !== 'NOT_STARTED'
    const hasPracticeProgress = p.categoryProgress.some((cp) => cp.practiceStatus !== 'NOT_STARTED')
    return !hasTheoryProgress && !hasPracticeProgress
  }).length

  // === Готовы к экзамену (теория завершена, практика завершена) ===
  const readyForExam = studentProgresses.filter((p) => {
    if (p.status !== 'ACTIVE') {
      return false
    }
    const theoryCompleted = p.theoryStatus === 'COMPLETED'
    const practiceCompleted = p.categoryProgress.some((cp) => cp.practiceStatus === 'COMPLETED')
    return theoryCompleted && practiceCompleted
  }).length

  // === KPI метрики ===
  const activeStudentsCount = studentProgresses.filter((p) => p.status === 'ACTIVE').length

  // Занятий за неделю
  const weekLessons = await db.lesson.count({
    where: {
      courseEnrollment: {
        progressId: { in: progressIds },
      },
      slot: {
        startTime: { gte: weekAgo },
      },
      status: 'COMPLETED',
    },
  })

  // Выручка за месяц (оплаченные платежи)
  const monthPayments = await db.coursePayment.aggregate({
    where: {
      enrollment: {
        progressId: { in: progressIds },
      },
      paidAt: { gte: monthAgo },
    },
    _sum: { amount: true },
  })

  const revenueThisMonth = Number(monthPayments._sum.amount || 0)

  // Процент сдачи экзаменов (из ExamAttempt)
  const [passedExams, totalExams] = await Promise.all([
    db.examAttempt.count({
      where: {
        result: 'PASSED',
        session: {
          organizationId,
          scheduledAt: { gte: monthAgo },
        },
      },
    }),
    db.examAttempt.count({
      where: {
        result: { in: ['PASSED', 'FAILED'] },
        session: {
          organizationId,
          scheduledAt: { gte: monthAgo },
        },
      },
    }),
  ])

  const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0

  return {
    success: true,
    data: {
      today: {
        lessons: {
          total: lessonsTotal,
          completed: lessonsCompleted,
          cancelled: lessonsCancelled,
          upcoming: lessonsUpcoming,
        },
        exams: {
          total: examsTotal,
          internal: examsInternal,
          gibdd: examsGibdd,
        },
        payments: {
          amount: todayPaymentAmount,
          studentsCount: todayStudentsCount,
        },
      },
      needsAttention: {
        documents: {
          expiringSoon: expiringSoonDocs,
          pendingReview: pendingReviewDocs,
        },
        finances: {
          overduePayments,
          overdueAmount,
        },
        training: {
          inactiveStudents,
          readyForExam,
        },
      },
      kpi: {
        activeStudents: activeStudentsCount,
        lessonsThisWeek: weekLessons,
        revenueThisMonth,
        passRate,
      },
    },
  }
}
