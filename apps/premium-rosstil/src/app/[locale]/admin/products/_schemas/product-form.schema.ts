import { GenderFormSchema as GenderSchema } from '@/generated/form-schemas/enums/Gender.form'
import { z } from 'zod/v4'

/**
 * Кастомная схема для форм создания/редактирования Product.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const ProductFormSchema = z
  .object({
    name: z.string().min(1, 'Название обязательно для заполнения'),
    description: z.string().optional(),
    gender: GenderSchema,
    categoryId: z.string().optional(), // Опциональная категория
  })
  .strip()

export type ProductFormData = z.infer<typeof ProductFormSchema>
