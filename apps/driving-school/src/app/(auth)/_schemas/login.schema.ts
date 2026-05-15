import { emailSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Схема формы входа с UI метаданными
 * При входе мы не проверяем сложность пароля - это проверяется при регистрации
 */
export const LoginSchema = z
  .object({
    email: emailSchema.meta({
      ui: {
        title: 'Email',
        placeholder: 'example@mail.com',
        description: 'Адрес электронной почты для входа',
      },
    }),
    password: z
      .string()
      .min(1, 'Введите пароль')
      .meta({
        ui: {
          title: 'Пароль',
          placeholder: 'Введите пароль',
          fieldType: 'password',
        },
      }),
    callbackUrl: z.string().optional(),
  })
  .strip()

export type LoginFormData = z.infer<typeof LoginSchema>
