import { z } from 'zod/v4'

/**
 * Схема валидации цены / денежной суммы
 * Принимает строку или число, возвращает number
 * Пустая строка трансформируется в NaN и будет отклонена валидатором
 *
 * Используется в: driving-school (lesson-type-form)
 *
 * @example
 * priceSchema.parse(1500) // 1500
 * priceSchema.parse('1500') // 1500
 * priceSchema.parse('') // Ошибка: "Введите корректную сумму"
 */
export const priceSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return NaN // Пустая строка → NaN → будет отклонена валидатором
    }
    return Number(val)
  })
  .pipe(
    z
      .number({ message: 'Введите корректную сумму' })
      .min(0, { message: 'Сумма не может быть отрицательной' })
      .max(100000000, { message: 'Сумма слишком большая' }),
  )

/**
 * Конфигурируемая схема валидации цены
 * Позволяет задать свои min/max границы
 *
 * @param options - опции валидации
 * @param options.min - минимальное значение (по умолчанию 0)
 * @param options.max - максимальное значение (по умолчанию 100000000)
 * @param options.minMessage - сообщение при значении меньше min
 * @param options.maxMessage - сообщение при значении больше max
 *
 * @example
 * const lessonPriceSchema = createPriceSchema({
 *   max: 1000000,
 *   maxMessage: 'Цена не может превышать 1 000 000 ₽'
 * })
 */
export function createPriceSchema(options?: { min?: number; max?: number; minMessage?: string; maxMessage?: string }) {
  const { min = 0, max = 100000000, minMessage, maxMessage } = options ?? {}

  return z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string' && val.trim() === '') {
        return NaN
      }
      return Number(val)
    })
    .pipe(
      z
        .number({ message: 'Введите корректную сумму' })
        .min(min, { message: minMessage ?? `Минимальная сумма — ${min} ₽` })
        .max(max, { message: maxMessage ?? `Максимальная сумма — ${max} ₽` }),
    )
}

/**
 * Схема для опционального поля цены
 * Возвращает undefined если значение пустое
 *
 * @example
 * optionalPriceSchema.parse(1500) // 1500
 * optionalPriceSchema.parse('') // undefined
 * optionalPriceSchema.parse(undefined) // undefined
 */
export const optionalPriceSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') {
      return undefined
    }
    return Number(val)
  })
  .pipe(
    z
      .number()
      .min(0, { message: 'Сумма не может быть отрицательной' })
      .max(100000000, { message: 'Сумма слишком большая' })
      .optional(),
  )
