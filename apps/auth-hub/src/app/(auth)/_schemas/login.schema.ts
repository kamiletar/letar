import { z } from 'zod/v4'

export const LoginSchema = z
  .object({
    email: z.email('Некорректный email'),
    password: z.string().min(1, 'Введите пароль'),
  })
  .strip()

export type LoginData = z.infer<typeof LoginSchema>
