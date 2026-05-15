import { z } from 'zod/v4'

/**
 * Схема для сильного пароля
 */
const strongPasswordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(/[a-z]/, 'Должна быть хотя бы одна строчная буква')
  .regex(/[A-Z]/, 'Должна быть хотя бы одна заглавная буква')
  .regex(/[0-9]/, 'Должна быть хотя бы одна цифра')

/**
 * Схема валидации для формы регистрации
 */
export const RegisterSchema = z
  .object({
    email: z.email('Некорректный email').meta({
      ui: { title: 'Email', placeholder: 'your@email.com' },
    }),
    password: strongPasswordSchema.meta({
      ui: { title: 'Пароль', placeholder: 'Минимум 8 символов' },
    }),
    acceptPrivacy: z.boolean().refine((val) => val === true, {
      message: 'Необходимо принять политику конфиденциальности',
    }),
  })
  .strip()

export type RegisterFormData = z.infer<typeof RegisterSchema>
