import { z } from 'zod/v4'

import { emailSchema } from '@/app/_schemas/common.schema'

/**
 * Схема валидации для формы входа.
 */
export const LoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Введите пароль'),
  })
  .strip()

export type LoginFormData = z.infer<typeof LoginSchema>
