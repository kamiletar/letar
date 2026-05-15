import { z } from 'zod/v4'

/** Схема для создания/редактирования промокода */
export const PromoFormSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Минимум 3 символа')
      .max(20, 'Максимум 20 символов')
      .regex(/^[A-ZА-Я0-9_-]+$/i, 'Только буквы, цифры, дефис, подчёркивание')
      .transform((v) => v.toUpperCase()),

    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),

    discount: z.coerce.number().positive('Скидка должна быть больше 0'),

    description: z.string().max(500).optional(),

    isActive: z.coerce.boolean().default(true),

    dateFrom: z.coerce.date(),
    dateTo: z.coerce.date(),

    minAmount: z.coerce
      .number()
      .positive()
      .optional()
      .or(z.literal(0))
      .transform((v) => v || undefined),
    maxUsages: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .or(z.literal(0))
      .transform((v) => v || undefined),
    perCustomer: z.coerce.number().int().positive().default(1),
  })
  .strip()
  .refine((data) => data.dateTo > data.dateFrom, {
    message: 'Дата окончания должна быть позже даты начала',
    path: ['dateTo'],
  })
  .refine((data) => data.type !== 'PERCENTAGE' || data.discount <= 100, {
    message: 'Процент скидки не может быть больше 100',
    path: ['discount'],
  })

export type PromoFormData = z.infer<typeof PromoFormSchema>
