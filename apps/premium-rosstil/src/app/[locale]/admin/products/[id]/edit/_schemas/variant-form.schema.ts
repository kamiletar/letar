import { z } from 'zod/v4'

/**
 * Кастомная схема для форм создания/редактирования ProductVariant.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const VariantFormSchema = z
  .object({
    color: z.string().min(1, 'Цвет обязателен для заполнения'),
    composition: z.string().min(1, 'Состав обязателен для заполнения'),
  })
  .strip()

export type VariantFormData = z.infer<typeof VariantFormSchema>
