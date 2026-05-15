import { z } from 'zod/v4'

/** Схема формы запроса возврата */
export const ReturnRequestSchema = z
  .object({
    subOrderId: z.string().min(1, 'Выберите подзаказ'),
    reason: z.string().min(5, 'Укажите причину возврата (минимум 5 символов)').max(500),
    description: z.string().max(2000).optional(),
    images: z.array(z.string()).max(5, 'Максимум 5 фотографий').optional(),
  })
  .strip()

export type ReturnRequestInput = z.infer<typeof ReturnRequestSchema>
