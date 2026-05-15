import { passwordSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Базовая схема для смены пароля.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
const ChangePasswordSchemaBase = z
  .object({
    // Для пользователей без пароля (только OAuth) это поле не отправляется
    // Для пользователей с паролем - обязательно и проверяется в server action
    currentPassword: z.string().optional(),
    newPassword: passwordSchema.max(100, 'Пароль слишком длинный'),
    confirmPassword: z.string().min(1, 'Подтвердите новый пароль'),
  })
  .strip()

/**
 * Схема для смены пароля с проверкой совпадения паролей.
 */
export const ChangePasswordSchema = ChangePasswordSchemaBase.refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  }
)

export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>
