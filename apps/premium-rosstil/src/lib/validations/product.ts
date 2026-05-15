import { Gender } from '@/generated/prisma'
import { z } from 'zod/v4'

/**
 * Схема валидации для товарного предложения (ProductItem)
 */
export const productItemSchema = z.object({
  sizeId: z.string().min(1, 'Размер обязателен'),
  price: z.coerce
    .number({ message: 'Цена должна быть числом' })
    .positive('Цена должна быть положительной')
    .multipleOf(0.01, 'Цена должна иметь не более 2 знаков после запятой'),
  availableCount: z.coerce
    .number({ message: 'Количество должно быть числом' })
    .int('Количество должно быть целым числом')
    .nonnegative('Количество не может быть отрицательным')
    .default(0),
})

/**
 * Схема валидации для изображения варианта (VariantImage)
 */
export const variantImageSchema = z.object({
  url: z
    .string()
    .min(1, 'URL обязателен')
    .refine(
      (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
      'URL должен быть абсолютным или начинаться с /'
    ),
  alt: z.string().optional(),
  order: z.coerce.number().int().nonnegative().default(0),
})

/**
 * Схема валидации для варианта продукта (ProductVariant)
 */
export const productVariantSchema = z.object({
  composition: z.string().min(1, 'Состав обязателен'),
  color: z.string().min(1, 'Цвет обязателен'),
  items: z.array(productItemSchema).min(1, 'Необходимо добавить хотя бы один размер'),
  images: z.array(variantImageSchema).default([]),
})

/**
 * Схема валидации для создания продукта
 */
export const createProductSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().optional(),
  gender: z.nativeEnum(Gender).default(Gender.FEMALE),
  variants: z.array(productVariantSchema).min(1, 'Необходимо добавить хотя бы один вариант'),
})

/**
 * Схема валидации для обновления продукта
 * Используем ту же схему, что и для создания
 */
export const updateProductSchema = createProductSchema

/**
 * Типы для TypeScript
 */
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductVariantInput = z.infer<typeof productVariantSchema>
export type ProductItemInput = z.infer<typeof productItemSchema>
export type VariantImageInput = z.infer<typeof variantImageSchema>
