import { z } from 'zod/v4'

export interface CreatePinSchemaConfig {
  /** Длина PIN-кода (по умолчанию 6) */
  length?: number
  /** Сообщение об ошибке */
  errorMessage?: string
  /** UI метаданные для поля */
  uiMeta?: {
    title?: string
    description?: string
    fieldType?: string
    fieldProps?: Record<string, unknown>
  }
}

/**
 * Создаёт Zod-схему для валидации PIN-кода.
 *
 * @example
 * ```typescript
 * const PinSchema = createPinSchema({ length: 6 })
 *
 * // С UI метаданными для @letar/forms
 * const PinSchemaWithMeta = createPinSchema({
 *   length: 6,
 *   uiMeta: {
 *     title: 'Код подтверждения',
 *     description: 'Введите 6-значный код из письма',
 *     fieldType: 'pinInput',
 *     fieldProps: { count: 6, otp: true },
 *   },
 * })
 * ```
 */
export function createPinSchema(config: CreatePinSchemaConfig = {}) {
  const { length = 6, errorMessage = `Введите ${length}-значный код`, uiMeta } = config

  let pinField = z.string().length(length, errorMessage)

  if (uiMeta) {
    pinField = pinField.meta({ ui: uiMeta })
  }

  return z.object({ pin: pinField }).strip()
}

/**
 * Схема для 6-значного PIN-кода с UI метаданными.
 */
export const VerifyPinSchema = createPinSchema({
  length: 6,
  uiMeta: {
    title: 'Код подтверждения',
    description: 'Введите 6-значный код из письма',
    fieldType: 'pinInput',
    fieldProps: {
      count: 6,
      otp: true,
    },
  },
})

export type VerifyPinFormData = z.infer<typeof VerifyPinSchema>
