import { z } from 'zod/v4'

/**
 * Кастомная схема для форм создания/редактирования ProductItem.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const ItemFormSchema = z
  .object({
    sizeId: z.string().min(1, 'Размер обязателен для заполнения'),
    price: z
      .string()
      .min(1, 'Цена обязательна для заполнения')
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Цена должна быть положительным числом',
      }),
    availableCount: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Количество должно быть неотрицательным числом',
      })
      .optional()
      .default('0'),
  })
  .strip()

export type ItemFormData = z.infer<typeof ItemFormSchema>
