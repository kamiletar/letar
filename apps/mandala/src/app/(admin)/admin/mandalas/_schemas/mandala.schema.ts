import { MandalaCreateFormSchema } from '@/generated/form-schemas/Mandala.form'
import type { z } from 'zod/v4'

import { optionalImageIdSchema, requiredImageIdSchema } from '@/app/_schemas/common.schema'

/**
 * Админская форма мандалы: генерируемая схема + изображения.
 * Поля slug, name, description, isSquare, metaTitle, metaDescription, metaKeywords,
 * defaultEffectIndex, order, published приходят из MandalaCreateFormSchema с UI метаданными.
 */
export const AdminMandalaFormSchema = MandalaCreateFormSchema.extend({
  imageId: requiredImageIdSchema,
  centerImageId: optionalImageIdSchema,
  watermarkId: optionalImageIdSchema,
  ogImageId: optionalImageIdSchema, // Если не указан — используется imageId
})

export type AdminMandalaFormInput = z.infer<typeof AdminMandalaFormSchema>

// Алиасы для обратной совместимости с server actions
export const createMandalaSchema = AdminMandalaFormSchema
export const updateMandalaSchema = AdminMandalaFormSchema.partial()
export type CreateMandalaInput = AdminMandalaFormInput
export type UpdateMandalaInput = z.infer<typeof updateMandalaSchema>
