import { z } from 'zod/v4'

/**
 * Кастомная схема для формы оформления заказа.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const CheckoutFormSchema = z
  .object({
    // Информация о покупателе
    customerName: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100, 'Имя слишком длинное'),

    customerPhone: z
      .string()
      .min(10, 'Укажите корректный номер телефона')
      .regex(/^[\d\s+\-()]+$/, 'Номер телефона содержит недопустимые символы'),

    customerEmail: z.string().email('Укажите корректный email').optional().or(z.literal('')),

    // Адрес доставки
    deliveryAddress: z.string().min(10, 'Укажите полный адрес доставки').max(500, 'Адрес слишком длинный'),

    deliveryCity: z.string().optional(),
    deliveryRegion: z.string().optional(),
    deliveryPostalCode: z.string().optional(),

    // Сохранение данных в профиль (адрес и телефон)
    saveToProfile: z.coerce.boolean().default(true),

    // Промокод
    promoCode: z
      .string()
      .max(20)
      .transform((v) => (v ? v.toUpperCase().trim() : ''))
      .optional()
      .or(z.literal('')),

    // Комментарий к заказу
    notes: z.string().max(1000, 'Комментарий слишком длинный').optional(),

    // Программа лояльности — количество баллов для списания
    loyaltyPoints: z.coerce.number().int().min(0).default(0),
  })
  .strip() // ← ВАЖНО: .strip() вместо .strict()

export type CheckoutFormData = z.infer<typeof CheckoutFormSchema>
