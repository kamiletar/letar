import { z } from 'zod/v4'

/**
 * Универсальная схема PIN кода для верификации
 * Используется для регистрации и сброса пароля
 */
export const PinSchema = z
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

export type PinFormData = z.infer<typeof PinSchema>
