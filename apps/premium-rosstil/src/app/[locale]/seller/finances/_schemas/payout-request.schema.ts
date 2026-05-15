import { z } from 'zod/v4'

/**
 * Схема запроса на выплату.
 * Для самозанятых обязательны данные чека.
 */
export const PayoutRequestSchema = z
  .object({
    requestedAmount: z.number().positive('Сумма должна быть больше 0'),
    receiptNumber: z.string().optional(),
    receiptDate: z.string().optional(), // ISO date string
    receiptAmount: z.number().positive().optional(),
    receiptImageIds: z.array(z.string()).optional(),
    sellerNote: z.string().max(500).optional(),
  })
  .strip()

export type PayoutRequestFormData = z.infer<typeof PayoutRequestSchema>
