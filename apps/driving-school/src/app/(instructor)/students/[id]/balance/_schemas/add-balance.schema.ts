import { MAX_PREPAID_LESSONS } from '@/lib/balance'
import { z } from 'zod/v4'

/**
 * Схема валидации для пополнения баланса предоплаченных занятий
 */
export const AddBalanceSchema = z
  .object({
    amount: z.coerce
      .number({ message: 'Укажите количество занятий' })
      .int({ message: 'Количество должно быть целым числом' })
      .min(1, { message: 'Минимум 1 занятие' })
      .max(MAX_PREPAID_LESSONS, { message: `Максимум ${MAX_PREPAID_LESSONS} занятий` })
      .meta({
        ui: {
          title: 'Количество занятий',
          placeholder: '5',
          fieldType: 'number',
          description: 'Сколько занятий добавить на баланс',
        },
      }),
    comment: z
      .string()
      .max(500, { message: 'Комментарий слишком длинный' })
      .optional()
      .meta({
        ui: {
          title: 'Комментарий',
          placeholder: 'Оплата за 5 занятий',
          fieldType: 'textarea',
          description: 'Причина пополнения баланса',
        },
      }),
  })
  .strip()

export type AddBalanceInput = z.infer<typeof AddBalanceSchema>
export type AddBalanceData = AddBalanceInput
