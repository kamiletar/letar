import { z } from 'zod/v4'

/** Валидация надёжного пароля */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(/[a-z]/, 'Должна быть хотя бы одна строчная буква')
  .regex(/[A-Z]/, 'Должна быть хотя бы одна заглавная буква')
  .regex(/[0-9]/, 'Должна быть хотя бы одна цифра')

export const RegisterSchema = z
  .object({
    email: z.email('Некорректный email'),
    password: strongPasswordSchema,
    name: z.string().min(2, 'Минимум 2 символа').optional(),
    acceptPrivacy: z.boolean().refine((val) => val === true, {
      message: 'Необходимо принять политику конфиденциальности',
    }),
  })
  .strip()

export type RegisterData = z.infer<typeof RegisterSchema>
