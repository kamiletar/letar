import { z } from 'zod/v4'

import { emailSchema } from '@/app/_schemas/common.schema'

/**
 * Схема валидации для формы регистрации.
 */
export const RegisterSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(/[a-z]/, 'Добавьте строчную букву')
      .regex(/[A-Z]/, 'Добавьте заглавную букву')
      .regex(/\d/, 'Добавьте цифру'),
    name: z.string().min(2, 'Минимум 2 символа').optional(),
  })
  .strip()

export type RegisterFormData = z.infer<typeof RegisterSchema>
