import { ProductCreateFormSchema } from '@/generated/form-schemas/Product.form'
import { z } from 'zod/v4'

import { optionalImageIdSchema, requiredImageIdSchema } from '@/app/_schemas/common.schema'

/** Схема изображения продукта */
export const productImageSchema = z.object({
  imageId: requiredImageIdSchema,
  order: z.number().min(0),
})

/**
 * Админская форма продукта: генерируемая схема + изображения.
 * Поля slug, name, description, price, metaTitle, metaDescription, order, published, inStock
 * приходят из ProductCreateFormSchema с UI метаданными.
 */
export const AdminProductFormSchema = ProductCreateFormSchema.extend({
  productImages: z.array(productImageSchema).optional().default([]),
  ogImageId: optionalImageIdSchema,
})

export type ProductImageInput = z.infer<typeof productImageSchema>
export type AdminProductFormInput = z.infer<typeof AdminProductFormSchema>

// Алиасы для обратной совместимости с server actions
export const createProductSchema = AdminProductFormSchema
export const updateProductSchema = AdminProductFormSchema.partial()
export type CreateProductInput = AdminProductFormInput
export type UpdateProductInput = z.infer<typeof updateProductSchema>
