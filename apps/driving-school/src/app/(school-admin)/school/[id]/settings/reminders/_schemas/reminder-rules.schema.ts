/**
 * Схемы валидации для правил напоминаний (Фаза 18)
 */

import { z } from 'zod/v4'

// Типы напоминаний
export const ReminderTypeSchema = z.enum([
  'DOCUMENT_EXPIRING',
  'PAYMENT_OVERDUE',
  'INACTIVE_STUDENT',
  'EXAM_UPCOMING',
  'LESSON_TOMORROW',
  'DOCUMENTS_PENDING_LONG',
])

export type ReminderTypeValue = z.infer<typeof ReminderTypeSchema>

// Схема для создания/обновления правила
export const UpsertReminderRuleSchema = z
  .object({
    organizationId: z.string().min(1, 'Обязательное поле'),
    type: ReminderTypeSchema,
    enabled: z
      .boolean()
      .default(true)
      .meta({ ui: { title: 'Включено' } }),
    triggerDays: z
      .array(z.number().int().min(1).max(365))
      .min(1, 'Укажите хотя бы один день')
      .default([7, 3, 1])
      .meta({ ui: { title: 'За сколько дней напоминать' } }),
    pushEnabled: z
      .boolean()
      .default(true)
      .meta({ ui: { title: 'Push-уведомления' } }),
    emailEnabled: z
      .boolean()
      .default(true)
      .meta({ ui: { title: 'Email' } }),
    telegramEnabled: z
      .boolean()
      .default(false)
      .meta({ ui: { title: 'Telegram' } }),
    sendToStudent: z
      .boolean()
      .default(true)
      .meta({ ui: { title: 'Отправлять ученику' } }),
    sendToManager: z
      .boolean()
      .default(false)
      .meta({ ui: { title: 'Отправлять менеджеру' } }),
    escalateAfterDays: z
      .number()
      .int()
      .min(1)
      .max(365)
      .nullable()
      .optional()
      .meta({ ui: { title: 'Эскалация через (дней)', placeholder: 'Оставьте пустым для отключения' } }),
  })
  .strip()

export type UpsertReminderRuleData = z.infer<typeof UpsertReminderRuleSchema>

// Алиас для использования в DrivingSchoolForm
export const ReminderRuleFormSchema = UpsertReminderRuleSchema

// Схема для обновления статуса (вкл/выкл)
export const ToggleReminderRuleSchema = z
  .object({
    ruleId: z.string().min(1, 'Обязательное поле'),
    enabled: z.boolean(),
  })
  .strip()

export type ToggleReminderRuleData = z.infer<typeof ToggleReminderRuleSchema>

// Метаданные для UI — описания типов напоминаний
export const REMINDER_TYPE_METADATA: Record<
  ReminderTypeValue,
  {
    title: string
    description: string
    icon: string
    defaultTriggerDays: number[]
    supportsStudentNotification: boolean
    supportsManagerNotification: boolean
  }
> = {
  DOCUMENT_EXPIRING: {
    title: 'Истекающие документы',
    description: 'Напоминание о необходимости обновить медсправку или другой документ',
    icon: 'LuFileWarning',
    defaultTriggerDays: [30, 14, 7, 3, 1],
    supportsStudentNotification: true,
    supportsManagerNotification: true,
  },
  PAYMENT_OVERDUE: {
    title: 'Просроченные платежи',
    description: 'Напоминание о необходимости оплатить обучение',
    icon: 'LuCreditCard',
    defaultTriggerDays: [7, 3, 1],
    supportsStudentNotification: true,
    supportsManagerNotification: true,
  },
  INACTIVE_STUDENT: {
    title: 'Неактивные ученики',
    description: 'Ученик давно не записывался на занятия',
    icon: 'LuUserX',
    defaultTriggerDays: [14, 7],
    supportsStudentNotification: true,
    supportsManagerNotification: true,
  },
  EXAM_UPCOMING: {
    title: 'Предстоящий экзамен',
    description: 'Напоминание о дате экзамена',
    icon: 'LuClipboardCheck',
    defaultTriggerDays: [7, 3, 1],
    supportsStudentNotification: true,
    supportsManagerNotification: false,
  },
  LESSON_TOMORROW: {
    title: 'Занятие завтра',
    description: 'Напоминание о предстоящем занятии',
    icon: 'LuCalendar',
    defaultTriggerDays: [1],
    supportsStudentNotification: true,
    supportsManagerNotification: false,
  },
  DOCUMENTS_PENDING_LONG: {
    title: 'Документы на проверке',
    description: 'Документ ожидает проверки слишком долго',
    icon: 'LuClock',
    defaultTriggerDays: [7, 3],
    supportsStudentNotification: false,
    supportsManagerNotification: true,
  },
}
