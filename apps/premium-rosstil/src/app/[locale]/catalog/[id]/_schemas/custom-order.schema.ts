import { z } from 'zod/v4'

// =============================================================================
// Путь 2: На заказ (MADE_TO_ORDER)
// Выбор модели + размер + замеры + детали кастомизации
// =============================================================================
export const madeToOrderSchema = z
  .object({
    // Вариант товара (цвет)
    variantId: z.string().min(1, 'Выберите вариант товара'),
    // Размер (опционально - если выбрали конкретный размер)
    productItemId: z.string().optional(),
    // Индивидуальные мерки
    customBust: z.coerce.number().min(60, 'Минимум 60 см').max(200, 'Максимум 200 см'),
    customWaist: z.coerce.number().min(50, 'Минимум 50 см').max(180, 'Максимум 180 см'),
    customHips: z.coerce.number().min(60, 'Минимум 60 см').max(220, 'Максимум 220 см'),
    customHeight: z.coerce.number().min(140, 'Минимум 140 см').max(220, 'Максимум 220 см').optional(),
    // Детали кастомизации (опционально)
    customDetails: z.string().max(1000, 'Максимум 1000 символов').optional(),
    // Контакты
    customerName: z.string().min(2, 'Введите имя'),
    customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
    customerEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
    notes: z.string().max(2000, 'Максимум 2000 символов').optional(),
  })
  .strip()

export type MadeToOrderFormData = z.infer<typeof madeToOrderSchema>

// =============================================================================
// Путь 3: Индивидуальный заказ (CUSTOM_DESIGN)
// Свой дизайн без привязки к модели + фото-ориентир + описание
// =============================================================================
export const customDesignOrderSchema = z
  .object({
    // Индивидуальные мерки
    customBust: z.coerce.number().min(60, 'Минимум 60 см').max(200, 'Максимум 200 см'),
    customWaist: z.coerce.number().min(50, 'Минимум 50 см').max(180, 'Максимум 180 см'),
    customHips: z.coerce.number().min(60, 'Минимум 60 см').max(220, 'Максимум 220 см'),
    customHeight: z.coerce.number().min(140, 'Минимум 140 см').max(220, 'Максимум 220 см').optional(),
    // Описание дизайна (обязательно)
    designDescription: z
      .string()
      .min(10, 'Опишите желаемое изделие (минимум 10 символов)')
      .max(3000, 'Максимум 3000 символов'),
    // Фото-ориентиры (массив ID изображений из таблицы Image)
    referenceImages: z.array(z.string()).max(5, 'Максимум 5 фото').optional(),
    // Контакты
    customerName: z.string().min(2, 'Введите имя'),
    customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
    customerEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
    notes: z.string().max(2000, 'Максимум 2000 символов').optional(),
  })
  .strip()

export type CustomDesignOrderFormData = z.infer<typeof customDesignOrderSchema>

// =============================================================================
// Путь 4: Сотрудничество B2B (B2B_PARTNERSHIP)
// Для магазинов, баеров, брендов - модель + размерная сетка + количество + цвет
// =============================================================================
export const wholesaleItemSchema = z.object({
  sizeId: z.string(),
  quantity: z.coerce.number().min(0),
})

export const b2bPartnershipOrderSchema = z
  .object({
    // Вариант товара (модель + цвет)
    variantId: z.string().min(1, 'Выберите вариант товара'),
    // Размерная сетка с количеством
    wholesaleItems: z
      .array(wholesaleItemSchema)
      .min(1, 'Укажите хотя бы один размер')
      .refine((items) => items.some((item) => item.quantity > 0), {
        message: 'Укажите количество хотя бы для одного размера',
      }),
    // Предпочитаемый цвет (если отличается от варианта)
    preferredColor: z.string().max(100, 'Максимум 100 символов').optional(),
    // Реквизиты компании
    companyName: z.string().min(2, 'Введите название организации'),
    companyINN: z
      .string()
      .min(10, 'ИНН должен содержать 10 или 12 цифр')
      .max(12, 'ИНН должен содержать 10 или 12 цифр')
      .regex(/^\d+$/, 'ИНН должен содержать только цифры'),
    companyAddress: z.string().min(10, 'Введите юридический адрес'),
    // Контакты
    customerName: z.string().min(2, 'Введите имя контактного лица'),
    customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
    customerEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
    notes: z.string().max(2000, 'Максимум 2000 символов').optional(),
  })
  .strip()

export type B2BPartnershipOrderFormData = z.infer<typeof b2bPartnershipOrderSchema>

// =============================================================================
// Legacy exports для совместимости (будут удалены после полной миграции)
// =============================================================================
/** @deprecated Use madeToOrderSchema instead */
export const outOfStockOrderSchema = z
  .object({
    productItemId: z.string().min(1, 'Выберите размер'),
    quantity: z.coerce.number().min(1, 'Минимум 1 шт').max(100, 'Максимум 100 шт'),
    customerName: z.string().min(2, 'Введите имя'),
    customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
    customerEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
    notes: z.string().optional(),
  })
  .strip()

export type OutOfStockOrderFormData = z.infer<typeof outOfStockOrderSchema>

/** @deprecated Use madeToOrderSchema instead */
export const customSizeOrderSchema = z
  .object({
    variantId: z.string().min(1, 'Выберите вариант товара'),
    customBust: z.coerce.number().min(60, 'Минимум 60 см').max(200, 'Максимум 200 см'),
    customWaist: z.coerce.number().min(50, 'Минимум 50 см').max(180, 'Максимум 180 см'),
    customHips: z.coerce.number().min(60, 'Минимум 60 см').max(220, 'Максимум 220 см'),
    customHeight: z.coerce.number().min(140, 'Минимум 140 см').max(220, 'Максимум 220 см').optional(),
    customerName: z.string().min(2, 'Введите имя'),
    customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
    customerEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
    notes: z.string().optional(),
  })
  .strip()

export type CustomSizeOrderFormData = z.infer<typeof customSizeOrderSchema>

/** @deprecated Use b2bPartnershipOrderSchema instead */
export const wholesaleOrderSchema = z
  .object({
    variantId: z.string().min(1, 'Выберите вариант товара'),
    wholesaleItems: z
      .array(wholesaleItemSchema)
      .min(1, 'Укажите хотя бы один размер')
      .refine((items) => items.some((item) => item.quantity > 0), {
        message: 'Укажите количество хотя бы для одного размера',
      }),
    companyName: z.string().min(2, 'Введите название организации'),
    companyINN: z
      .string()
      .min(10, 'ИНН должен содержать 10 или 12 цифр')
      .max(12, 'ИНН должен содержать 10 или 12 цифр')
      .regex(/^\d+$/, 'ИНН должен содержать только цифры'),
    companyAddress: z.string().min(10, 'Введите юридический адрес'),
    customerName: z.string().min(2, 'Введите имя контактного лица'),
    customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
    customerEmail: z.string().email('Введите корректный email').optional().or(z.literal('')),
    notes: z.string().optional(),
  })
  .strip()

export type WholesaleOrderFormData = z.infer<typeof wholesaleOrderSchema>
