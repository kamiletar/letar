import { z } from 'zod/v4'

/**
 * Схема формы категории
 * Используется для создания и редактирования категорий
 */
export const CategoryFormSchema = z
  .object({
    name: z.string().min(1, 'Название обязательно для заполнения'),
    slug: z
      .string()
      .min(1, 'Slug обязателен для заполнения')
      .regex(/^[a-z0-9-]+$/, 'Slug может содержать только латинские буквы, цифры и дефисы'),
    sortOrder: z.coerce.number().int().min(0).default(0),
  })
  .strip()

export type CategoryFormData = z.infer<typeof CategoryFormSchema>
