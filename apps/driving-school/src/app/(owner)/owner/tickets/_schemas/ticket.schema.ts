import { TicketStatusFormSchema as TicketStatusSchema } from '@letar/driving-school-db/form-schemas/enums/TicketStatus.form'
import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'
import { z } from 'zod/v4'

// Схема для изменения статуса тикета
export const UpdateTicketStatusSchema = z
  .object({
    ticketId: z.string().min(1, { message: 'ID тикета обязателен' }),
    status: TicketStatusSchema.meta({
      ui: {
        title: 'Статус',
        fieldType: 'select',
      },
    }),
  })
  .strip()

export type UpdateTicketStatusData = z.infer<typeof UpdateTicketStatusSchema>

// Схема для назначения тикета
export const AssignTicketSchema = z
  .object({
    ticketId: z.string().min(1, { message: 'ID тикета обязателен' }),
    assignedToId: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Исполнитель',
          fieldType: 'select',
          description: 'Кому назначить тикет',
        },
      }),
  })
  .strip()

export type AssignTicketData = z.infer<typeof AssignTicketSchema>

// Схема для ответа на тикет
export const ReplyToTicketSchema = z
  .object({
    ticketId: z.string().min(1, { message: 'ID тикета обязателен' }),
    message: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, { message: 'Введите сообщение' }).max(2000, { message: 'Максимум 2000 символов' }))
      .meta({
        ui: {
          title: 'Ответ',
          placeholder: 'Введите ответ...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type ReplyToTicketData = z.infer<typeof ReplyToTicketSchema>

// Метки категорий на русском
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  HELP: 'Помощь',
  BUG: 'Ошибка',
  FEATURE: 'Предложение',
  OTHER: 'Другое',
}

// Метки статусов на русском
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Новый',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
}
