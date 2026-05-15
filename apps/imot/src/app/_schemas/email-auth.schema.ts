import { emailSchema, nameSchema, passwordSchema, tokenSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

// Схема для регистрации
export const RegisterSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .transform(({ confirmPassword: _, ...rest }) => rest)

// Схема для входа
export const SignInSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Пароль обязателен'),
  })
  .strip()

// Схема для запроса сброса пароля
export const RequestPasswordResetSchema = z
  .object({
    email: emailSchema,
  })
  .strip()

// Схема для установки нового пароля
export const ResetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .transform(({ confirmPassword: _, ...rest }) => rest)

// TypeScript типы
/** Тип для входных данных формы регистрации (включает confirmPassword для UI) */
export type RegisterFormInput = {
  name: string
  email: string
  password: string
  confirmPassword: string
}
/** Тип после валидации (без confirmPassword) */
export type RegisterFormData = z.output<typeof RegisterSchema>
export type SignInFormData = z.infer<typeof SignInSchema>
export type RequestPasswordResetFormData = z.infer<typeof RequestPasswordResetSchema>
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>
