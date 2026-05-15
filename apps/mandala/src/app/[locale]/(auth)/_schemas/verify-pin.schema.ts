import { z } from 'zod/v4'

/**
 * Схема валидации для формы верификации PIN.
 */
export const VerifyPinSchema = z
  .object({
    pin: z.string().length(6, 'Введите 6-значный код'),
  })
  .strip()

export type VerifyPinFormData = z.infer<typeof VerifyPinSchema>
