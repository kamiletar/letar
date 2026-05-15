import { OrderCreateFormSchema } from '@/generated/form-schemas/Order.form'
import { z } from 'zod/v4'

// Схема для checkout: из Order убираем status/total, добавляем cartItems
export const CheckoutFormSchema = OrderCreateFormSchema.omit({ status: true, total: true }).extend({
  cartItems: z.string(),
})

export type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>

/**
 * Zod схема для валидации элемента корзины.
 * Обеспечивает type-safe парсинг JSON данных корзины.
 */
export const CartItemDataSchema = z.object({
  productId: z.string().min(1, 'ID товара обязателен'),
  productSlug: z.string().min(1, 'Slug товара обязателен'),
  name: z.string().min(1, 'Название товара обязательно'),
  price: z.number().positive('Цена должна быть положительной'),
  quantity: z.number().int().positive('Количество должно быть положительным целым числом'),
})

/**
 * Zod схема для валидации массива элементов корзины.
 */
export const CartItemsArraySchema = z.array(CartItemDataSchema).min(1, 'Корзина не может быть пустой')

/** Тип для элемента корзины (выводится из Zod схемы) */
export type CartItemData = z.infer<typeof CartItemDataSchema>
