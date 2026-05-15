import { z } from 'zod/v4'

/**
 * Схема для запроса восстановления пароля.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const ForgotPasswordSchema = z
  .object({
    email: z.string().email('Введите корректный email адрес'),
  })
  .strip()

export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>
