import { z } from 'zod/v4'

/**
 * Схема валидации для формы входа
 */
export const LoginSchema = z
  .object({
    email: z.email('Некорректный email').meta({
      ui: { title: 'Email', placeholder: 'your@email.com' },
    }),
    password: z
      .string()
      .min(1, 'Введите пароль')
      .meta({
        ui: { title: 'Пароль', placeholder: 'Введите пароль' },
      }),
  })
  .strip()

export type LoginFormData = z.infer<typeof LoginSchema>
