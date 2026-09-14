import { z } from 'zod/v4'
import { strongPasswordSchema } from './register.schema'

/** Шаг 1 — запрос кода сброса пароля по email */
export const ForgotPasswordRequestSchema = z
  .object({
    email: z.email('Некорректный email'),
  })
  .strip()

export type ForgotPasswordRequestData = z.infer<typeof ForgotPasswordRequestSchema>

/** Шаг 2 — код из письма + новый пароль */
export const ResetPasswordSchema = z
  .object({
    pin: z.string().length(6, 'Введите 6-значный код').meta({
      ui: {
        title: 'Код из письма',
        fieldType: 'pinInput',
        fieldProps: { count: 6, otp: true },
      },
    }),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .strip()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>
