import { z } from 'zod/v4'

/**
 * Схема для сброса пароля по токену.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Токен обязателен'),
    password: z
      .string()
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .max(100, 'Пароль слишком длинный')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'
      ),
    confirmPassword: z.string().min(1, 'Подтвердите пароль'),
  })
  .strip()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>
