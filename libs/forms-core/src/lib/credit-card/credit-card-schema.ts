import { z } from 'zod/v4'
import { isExpiryValid } from './format-expiry'
import { luhn } from './luhn'

/**
 * Готовая Zod-схема для данных банковской карты.
 *
 * @example
 * ```typescript
 * import { creditCardSchema } from '@letar/forms'
 *
 * const PaymentSchema = z.object({
 *   card: creditCardSchema(),
 * })
 * ```
 */
export function creditCardSchema() {
  return z.object({
    number: z
      .string()
      .min(12, 'Минимум 12 цифр')
      .max(19, 'Максимум 19 цифр')
      .refine((val) => luhn(val), 'Некорректный номер карты'),
    expiry: z
      .string()
      .regex(/^\d{2}\/\d{2}$/, 'Формат MM/YY')
      .refine((val) => isExpiryValid(val), 'Карта просрочена'),
    cvc: z.string().min(3, 'Минимум 3 цифры').max(4, 'Максимум 4 цифры'),
  })
}
