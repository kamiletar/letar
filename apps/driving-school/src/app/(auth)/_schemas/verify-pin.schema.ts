import { z } from 'zod/v4'

/**
 * Схема верификации PIN кода с UI метаданными
 */
export const VerifyPinSchema = z
  .object({
    pin: z
      .string()
      .length(6, 'Введите 6-значный код')
      .meta({
        ui: {
          title: 'Код подтверждения',
          description: 'Введите 6-значный код из письма',
          fieldType: 'pinInput',
          fieldProps: {
            count: 6,
            otp: true,
          },
        },
      }),
  })
  .strip()

export type VerifyPinFormData = z.infer<typeof VerifyPinSchema>
