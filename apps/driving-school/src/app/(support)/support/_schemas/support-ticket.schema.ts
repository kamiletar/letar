import { TicketCategoryFormSchema as TicketCategorySchema } from '@letar/driving-school-db/form-schemas/enums/TicketCategory.form'
import type { TicketCategory } from '@letar/driving-school-db/prisma'
import { z } from 'zod/v4'

// Схема для создания тикета
export const CreateTicketSchema = z
  .object({
    category: TicketCategorySchema.meta({
      ui: {
        title: 'Тема обращения',
        fieldType: 'select',
      },
    }),
    subject: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(5, { message: 'Минимум 5 символов' }).max(100, { message: 'Максимум 100 символов' }))
      .meta({
        ui: {
          title: 'Тема',
          placeholder: 'Кратко опишите проблему',
        },
      }),
    description: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(20, { message: 'Опишите проблему подробнее (минимум 20 символов)' })
          .max(2000, { message: 'Максимум 2000 символов' })
      )
      .meta({
        ui: {
          title: 'Описание',
          placeholder: 'Подробно опишите вашу проблему...',
          fieldType: 'textarea',
          description: 'Чем подробнее, тем быстрее мы сможем помочь',
        },
      }),
  })
  .strip()

export type CreateTicketData = z.infer<typeof CreateTicketSchema>

// Схема для отправки сообщения в тикет
export const SendMessageSchema = z
  .object({
    ticketId: z.string().min(1, { message: 'ID тикета обязателен' }),
    content: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, { message: 'Введите сообщение' }).max(2000, { message: 'Максимум 2000 символов' }))
      .meta({
        ui: {
          title: 'Сообщение',
          placeholder: 'Введите сообщение...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type SendMessageData = z.infer<typeof SendMessageSchema>

// Схема для закрытия тикета
export const CloseTicketSchema = z
  .object({
    ticketId: z.string().min(1, { message: 'ID тикета обязателен' }),
  })
  .strip()

export type CloseTicketData = z.infer<typeof CloseTicketSchema>

// Метки категорий на русском
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  HELP: 'Помощь с использованием',
  BUG: 'Сообщение об ошибке',
  FEATURE: 'Предложение функции',
  OTHER: 'Другое',
}

// Метки статусов на русском
export const TICKET_STATUS_LABELS = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
} as const
