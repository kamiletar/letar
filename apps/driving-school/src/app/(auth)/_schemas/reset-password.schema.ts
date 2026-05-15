import { strongPasswordSchema, tokenSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Схема формы сброса пароля с UI метаданными
 */
export const ResetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: strongPasswordSchema.meta({
      ui: {
        title: 'Новый пароль',
        placeholder: 'Минимум 8 символов',
        description: 'Используйте буквы, цифры и специальные символы',
        fieldType: 'passwordStrength',
      },
    }),
    confirmPassword: z
      .string()
      .min(1, 'Подтвердите пароль')
      .meta({
        ui: {
          title: 'Подтвердите пароль',
          placeholder: 'Повторите пароль',
          fieldType: 'password',
        },
      }),
  })
  .strip()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>
