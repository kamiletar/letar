import { z } from 'zod/v4'

// Реэкспорт CartItemData из checkout.schema.ts (единый источник правды)
export type { CartItemData } from './checkout.schema'

export const createOrderSchema = z
  .object({
    name: z.string().min(1, 'Имя обязательно'),
    phone: z
      .string()
      .min(1, 'Телефон обязателен')
      .regex(/^\+?[\d\s\-()]+$/, 'Некорректный формат телефона'),
    email: z.string().email('Некорректный email').optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    comment: z.string().optional().or(z.literal('')),
    // Данные корзины передаются как JSON строка
    cartItems: z.string().min(1, 'Корзина пуста'),
  })
  .strip()

export type CreateOrderInput = z.infer<typeof createOrderSchema>
