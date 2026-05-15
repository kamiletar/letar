import { SessionStatusFormSchema as SessionStatusSchema } from '@/generated/form-schemas/enums/SessionStatus.form'
import { z } from 'zod/v4'

/**
 * Схема валидации для формы создания/редактирования сессии.
 * Использует .strip() для обработки React Server Actions service fields.
 */
export const SessionFormSchema = z
  .object({
    clientId: z.string().min(1, 'Клиент обязателен для выбора'),
    scheduledAt: z.string().min(1, 'Дата и время обязательны'), // ISO string для datetime-local input
    duration: z.coerce.number().int().positive('Длительность должна быть положительным числом').default(60),
    status: SessionStatusSchema.default('SCHEDULED'),
    topic: z.string().optional(),
    notes: z.string().optional(),
    homework: z.string().optional(),
    // Integrations (ЭТАП 7.2)
    meetingUrl: z.string().url('Некорректная ссылка').optional().or(z.literal('')),
    paymentUrl: z.string().url('Некорректная ссылка').optional().or(z.literal('')),
    paymentStatus: z.enum(['pending', 'paid', 'failed']).optional(),
  })
  .strip()

export type SessionFormData = z.infer<typeof SessionFormSchema>
