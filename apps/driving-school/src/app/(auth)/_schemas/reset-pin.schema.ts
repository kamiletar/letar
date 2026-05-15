import { z } from 'zod/v4'

/**
 * Схема PIN кода для сброса пароля с UI метаданными
 */
export const ResetPinSchema = z
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

export type ResetPinFormData = z.infer<typeof ResetPinSchema>
