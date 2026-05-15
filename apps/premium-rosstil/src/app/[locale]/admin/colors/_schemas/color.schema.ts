import { z } from 'zod/v4'

/**
 * Схема для создания/редактирования цвета
 */
export const ColorFormSchema = z
  .object({
    name: z.string().min(1, 'Название обязательно').max(50, 'Название не должно превышать 50 символов'),

    slug: z
      .string()
      .min(1, 'Slug обязателен')
      .max(30, 'Slug не должен превышать 30 символов')
      .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные буквы, цифры и дефисы'),

    hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'HEX должен быть в формате #RRGGBB'),
  })
  .strip()

export type ColorFormData = z.infer<typeof ColorFormSchema>
