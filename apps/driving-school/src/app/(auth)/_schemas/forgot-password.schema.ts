import { emailSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Схема формы запроса восстановления пароля с UI метаданными
 */
export const ForgotPasswordSchema = z
  .object({
    email: emailSchema.meta({
      ui: {
        title: 'Email',
        placeholder: 'example@mail.com',
        description: 'Введите email, указанный при регистрации',
      },
    }),
  })
  .strip()

export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>
