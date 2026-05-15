import { emailSchema, nameSchema, passwordSchema, tokenSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

// Базовая схема регистрации
const RegisterSchemaBase = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    consent: z.literal(true, { error: 'Необходимо принять условия' }),
  })
  .strip()

// Схема для регистрации с проверкой совпадения паролей
export const RegisterSchema = RegisterSchemaBase.refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

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

// Базовая схема сброса пароля
const ResetPasswordSchemaBase = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strip()

// Схема для установки нового пароля с проверкой совпадения
export const ResetPasswordSchema = ResetPasswordSchemaBase.refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

// TypeScript типы
export type RegisterFormData = z.infer<typeof RegisterSchema>
export type SignInFormData = z.infer<typeof SignInSchema>
export type RequestPasswordResetFormData = z.infer<typeof RequestPasswordResetSchema>
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>
