/**
 * Сервис автоматических напоминаний (Фаза 18)
 *
 * Обрабатывает правила напоминаний для каждой организации:
 * - DOCUMENT_EXPIRING — истекающие документы (медсправка!)
 * - PAYMENT_OVERDUE — просроченные платежи
 * - INACTIVE_STUDENT — нет занятий >N дней
 * - EXAM_UPCOMING — предстоящий экзамен
 * - LESSON_TOMORROW — занятие завтра
 * - DOCUMENTS_PENDING_LONG — документы на проверке >N дней
 */

import { prisma } from '@/lib/db'
import type { ReminderLogStatus, ReminderRule, ReminderType } from '@letar/driving-school-db/prisma'
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns'

// === Типы ===

export interface ProcessReminderResult {
  type: ReminderType
  processed: number
  sent: number
  errors: number
}

export interface ReminderTarget {
  userId: string // Получатель
  targetId: string // ID сущности (documentId, lessonId и т.д.)
  targetType: string // "StudentDocument", "Lesson" и т.д.
  title: string // Заголовок уведомления
  body: string // Текст уведомления
  daysBeforeEvent: number
}

// Интерфейс для отправки уведомления (упрощённый)
export interface SendNotificationFn {
  (params: {
    userId: string
    type: 'LESSON_REMINDER' // Используем существующий NotificationType
    title: string
    body: string
    data?: Record<string, unknown>
    channels: { push: boolean; email: boolean; telegram: boolean }
  }): Promise<{ success: boolean; channels: string[] }>
}

// === Основная функция ===

/**
 * Обрабатывает все включённые правила напоминаний
 */
export async function processAllReminders(sendNotification: SendNotificationFn): Promise<ProcessReminderResult[]> {
  const results: ProcessReminderResult[] = []

  // Получаем все включённые правила
  const rules = await prisma.reminderRule.findMany({
    where: { enabled: true },
    include: { organization: true },
  })

  // Группируем по типу для оптимизации
  const rulesByType = rules.reduce(
    (acc, rule) => {
      if (!acc[rule.type]) {
        acc[rule.type] = []
      }
      acc[rule.type].push(rule)
      return acc
    },
    {} as Record<ReminderType, typeof rules>
  )

  // Обрабатываем каждый тип
  for (const [type, typeRules] of Object.entries(rulesByType) as [ReminderType, typeof rules][]) {
    const result = await processReminderType(type, typeRules, sendNotification)
    results.push(result)
  }

  return results
}

/**
 * Обрабатывает правила конкретного типа
 */
async function processReminderType(
  type: ReminderType,
  rules: ReminderRule[],
  sendNotification: SendNotificationFn
): Promise<ProcessReminderResult> {
  const result: ProcessReminderResult = {
    type,
    processed: 0,
    sent: 0,
    errors: 0,
  }

  for (const rule of rules) {
    try {
      // Получаем цели для напоминания
      const targets = await getTargetsForRule(rule)
      result.processed += targets.length

      for (const target of targets) {
        // Проверяем, не отправляли ли уже сегодня
        const alreadySent = await checkAlreadySent(rule.id, target.targetId, target.daysBeforeEvent)
        if (alreadySent) {
          continue
        }

        // Отправляем уведомление
        try {
          const sendResult = await sendNotification({
            userId: target.userId,
            type: 'LESSON_REMINDER', // Используем существующий тип
            title: target.title,
            body: target.body,
            data: {
              reminderType: rule.type,
              targetId: target.targetId,
              targetType: target.targetType,
              daysBeforeEvent: target.daysBeforeEvent,
            },
            channels: {
              push: rule.pushEnabled,
              email: rule.emailEnabled,
              telegram: rule.telegramEnabled,
            },
          })

          // Записываем в лог
          await logReminder({
            ruleId: rule.id,
            type: rule.type,
            recipientId: target.userId,
            targetId: target.targetId,
            targetType: target.targetType,
            channels: sendResult.channels,
            status: sendResult.success ? 'SENT' : 'FAILED',
            daysBeforeEvent: target.daysBeforeEvent,
          })

          if (sendResult.success) {
            result.sent++
          } else {
            result.errors++
          }
        } catch (error) {
          result.errors++
          console.error(`[Reminders] Error sending reminder:`, error)

          // Записываем ошибку
          await logReminder({
            ruleId: rule.id,
            type: rule.type,
            recipientId: target.userId,
            targetId: target.targetId,
            targetType: target.targetType,
            channels: [],
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            daysBeforeEvent: target.daysBeforeEvent,
          })
        }
      }
    } catch (error) {
      console.error(`[Reminders] Error processing rule ${rule.id}:`, error)
    }
  }

  return result
}

// === Получение целей для каждого типа ===

async function getTargetsForRule(rule: ReminderRule): Promise<ReminderTarget[]> {
  const today = new Date()

  switch (rule.type) {
    case 'DOCUMENT_EXPIRING':
      return getExpiringDocuments(rule, today)
    case 'PAYMENT_OVERDUE':
      return getOverduePayments(rule, today)
    case 'INACTIVE_STUDENT':
      return getInactiveStudents(rule, today)
    case 'EXAM_UPCOMING':
      return getUpcomingExams(rule, today)
    case 'LESSON_TOMORROW':
      return getTomorrowLessons(rule, today)
    case 'DOCUMENTS_PENDING_LONG':
      return getPendingDocuments(rule, today)
    default:
      return []
  }
}

/**
 * Истекающие документы (медсправка!)
 */
async function getExpiringDocuments(rule: ReminderRule, today: Date): Promise<ReminderTarget[]> {
  const targets: ReminderTarget[] = []

  for (const days of rule.triggerDays) {
    const targetDate = addDays(today, days)

    const docs = await prisma.studentDocument.findMany({
      where: {
        progress: { organizationId: rule.organizationId },
        expiresAt: {
          gte: startOfDay(targetDate),
          lt: endOfDay(targetDate),
        },
        status: { not: 'EXPIRED' },
      },
      include: {
        progress: { include: { user: true } },
      },
    })

    for (const doc of docs) {
      const typeNames: Record<string, string> = {
        MEDICAL_CERTIFICATE: 'Медицинская справка',
        PASSPORT_COPY: 'Копия паспорта',
        SNILS_COPY: 'Копия СНИЛС',
        PHOTO: 'Фотографии',
        APPLICATION: 'Заявление',
        AGREEMENT: 'Согласие',
        TRAINING_CONTRACT: 'Договор на обучение',
        PAYMENT_RECEIPT: 'Квитанция об оплате',
        STATE_FEE_RECEIPT: 'Квитанция госпошлины',
        TRAINING_CERTIFICATE: 'Свидетельство об обучении',
        OTHER: 'Другой документ',
      }

      targets.push({
        userId: doc.progress.userId,
        targetId: doc.id,
        targetType: 'StudentDocument',
        title: `Документ истекает через ${days} дн.`,
        body: `${typeNames[doc.type] || doc.type} требует обновления до ${doc.expiresAt?.toLocaleDateString('ru-RU')}`,
        daysBeforeEvent: days,
      })
    }
  }

  return targets
}

/**
 * Просроченные платежи
 * Примечание: CoursePayment связан через enrollment -> progress
 */
async function getOverduePayments(rule: ReminderRule, _today: Date): Promise<ReminderTarget[]> {
  // CoursePayment в текущей схеме не имеет поля dueDate и status PENDING
  // Это плейсхолдер для будущей реализации платежей с дедлайнами
  // eslint-disable-next-line no-console -- информационное сообщение для отладки
  console.log(`[Reminders] PAYMENT_OVERDUE: Not implemented for org ${rule.organizationId}`)
  return []
}

/**
 * Неактивные ученики (нет занятий >N дней)
 */
async function getInactiveStudents(rule: ReminderRule, today: Date): Promise<ReminderTarget[]> {
  const targets: ReminderTarget[] = []

  // По умолчанию triggerDays для неактивных = [14, 7] (проверяем 14 и 7 дней без занятий)
  for (const days of rule.triggerDays) {
    const cutoffDate = subDays(today, days)

    // Находим учеников школы в активном статусе
    const progresses = await prisma.studentProgress.findMany({
      where: {
        organizationId: rule.organizationId,
        status: 'ACTIVE',
      },
      include: {
        user: true,
        categoryProgress: {
          include: {
            courseEnrollments: {
              include: {
                lessons: {
                  where: { status: 'COMPLETED' },
                  orderBy: { updatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    for (const progress of progresses) {
      // Находим последнее завершённое занятие через courseEnrollments
      let lastLessonDate: Date | null = null

      for (const cat of progress.categoryProgress) {
        for (const enrollment of cat.courseEnrollments) {
          const lastLesson = enrollment.lessons[0]
          if (lastLesson?.updatedAt) {
            if (!lastLessonDate || lastLesson.updatedAt > lastLessonDate) {
              lastLessonDate = lastLesson.updatedAt
            }
          }
        }
      }

      // Если последнее занятие было точно N дней назад
      if (lastLessonDate) {
        const lastDate = startOfDay(lastLessonDate)
        const targetDate = startOfDay(cutoffDate)

        if (lastDate.getTime() === targetDate.getTime()) {
          targets.push({
            userId: progress.userId,
            targetId: progress.id,
            targetType: 'StudentProgress',
            title: `Вы не занимались ${days} дней`,
            body: 'Запишитесь на занятие, чтобы не потерять навыки!',
            daysBeforeEvent: -days,
          })
        }
      }
    }
  }

  return targets
}

/**
 * Предстоящий экзамен
 */
async function getUpcomingExams(rule: ReminderRule, today: Date): Promise<ReminderTarget[]> {
  const targets: ReminderTarget[] = []

  for (const days of rule.triggerDays) {
    const targetDate = addDays(today, days)

    // Ищем сессии экзаменов, запланированные на targetDate
    const sessions = await prisma.examSession.findMany({
      where: {
        organizationId: rule.organizationId,
        scheduledAt: {
          gte: startOfDay(targetDate),
          lt: endOfDay(targetDate),
        },
        status: 'SCHEDULED',
      },
      include: {
        registrations: {
          where: { cancelledAt: null },
          include: { user: true },
        },
      },
    })

    for (const session of sessions) {
      for (const reg of session.registrations) {
        // Определяем тип экзамена по названию
        const isTheory = session.type === 'INTERNAL_THEORY' || session.type === 'GIBDD_THEORY'

        targets.push({
          userId: reg.userId,
          targetId: reg.id,
          targetType: 'ExamRegistration',
          title: `Экзамен через ${days} дн.`,
          body: `${isTheory ? 'Теоретический' : 'Практический'} экзамен ${session.scheduledAt.toLocaleDateString(
            'ru-RU'
          )}`,
          daysBeforeEvent: days,
        })
      }
    }
  }

  return targets
}

/**
 * Занятие завтра
 * Примечание: Lesson связан со slot который содержит startTime
 * Инструкторы связаны с организацией через Member модель
 */
async function getTomorrowLessons(rule: ReminderRule, today: Date): Promise<ReminderTarget[]> {
  const targets: ReminderTarget[] = []
  const tomorrow = addDays(today, 1)

  // Получаем ID инструкторов организации (через Member)
  const orgMembers = await prisma.member.findMany({
    where: {
      organizationId: rule.organizationId,
      role: { in: ['instructor', 'owner', 'super_manager'] },
    },
    select: { userId: true },
  })
  const instructorIds = orgMembers.map((m) => m.userId)

  if (instructorIds.length === 0) {
    return targets
  }

  // Ищем уроки на завтра для инструкторов школы
  const lessons = await prisma.lesson.findMany({
    where: {
      slot: {
        startTime: {
          gte: startOfDay(tomorrow),
          lt: endOfDay(tomorrow),
        },
      },
      status: 'CONFIRMED',
      instructorId: { in: instructorIds },
    },
    include: {
      student: true,
      instructor: true,
      slot: true,
    },
  })

  for (const lesson of lessons) {
    const time = lesson.slot.startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

    // Напоминание ученику
    if (rule.sendToStudent) {
      targets.push({
        userId: lesson.studentId,
        targetId: lesson.id,
        targetType: 'Lesson',
        title: `Занятие завтра в ${time}`,
        body: `Инструктор: ${lesson.instructor.name || 'Не указан'}`,
        daysBeforeEvent: 1,
      })
    }
  }

  return targets
}

/**
 * Документы на проверке слишком долго
 */
async function getPendingDocuments(rule: ReminderRule, today: Date): Promise<ReminderTarget[]> {
  const targets: ReminderTarget[] = []

  // triggerDays для этого типа = [7, 3] (документ на проверке 7 или 3 дня)
  for (const days of rule.triggerDays) {
    const uploadedDate = subDays(today, days)

    const docs = await prisma.studentDocument.findMany({
      where: {
        progress: { organizationId: rule.organizationId },
        status: 'PENDING',
        createdAt: {
          gte: startOfDay(uploadedDate),
          lt: endOfDay(uploadedDate),
        },
      },
      include: {
        progress: {
          include: {
            user: true,
            organization: {
              include: {
                members: {
                  where: { role: { in: ['owner', 'super_manager', 'manager'] } },
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    })

    for (const doc of docs) {
      // Если нужно отправлять менеджеру
      if (rule.sendToManager) {
        for (const member of doc.progress.organization.members) {
          targets.push({
            userId: member.userId,
            targetId: doc.id,
            targetType: 'StudentDocument',
            title: `Документ ожидает проверки ${days} дн.`,
            body: `Ученик: ${doc.progress.user.name || 'Не указан'}. Пожалуйста, проверьте документ.`,
            daysBeforeEvent: -days,
          })
        }
      }
    }
  }

  return targets
}

// === Вспомогательные функции ===

/**
 * Проверяет, отправляли ли уже напоминание сегодня
 */
async function checkAlreadySent(ruleId: string, targetId: string, daysBeforeEvent: number): Promise<boolean> {
  const today = new Date()

  const existing = await prisma.reminderLog.findFirst({
    where: {
      ruleId,
      targetId,
      daysBeforeEvent,
      createdAt: {
        gte: startOfDay(today),
      },
    },
  })

  return !!existing
}

/**
 * Записывает лог напоминания
 */
async function logReminder(params: {
  ruleId: string
  type: ReminderType
  recipientId: string
  targetId: string
  targetType: string
  channels: string[]
  status: ReminderLogStatus
  error?: string
  daysBeforeEvent: number
}): Promise<void> {
  await prisma.reminderLog.create({
    data: {
      ruleId: params.ruleId,
      type: params.type,
      recipientId: params.recipientId,
      targetId: params.targetId,
      targetType: params.targetType,
      channels: params.channels,
      status: params.status,
      error: params.error,
      daysBeforeEvent: params.daysBeforeEvent,
    },
  })
}
