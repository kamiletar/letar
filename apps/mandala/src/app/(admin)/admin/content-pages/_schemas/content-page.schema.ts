import { ContentPageCreateFormSchema } from '@/generated/form-schemas/ContentPage.form'
import type { z } from 'zod/v4'

import { optionalImageIdSchema } from '@/app/_schemas/common.schema'

/**
 * Админская форма страницы: генерируемая схема + OG Image.
 * Поля slug, title, content, metaTitle, metaDescription, published
 * приходят из ContentPageCreateFormSchema с UI метаданными.
 */
export const AdminContentPageFormSchema = ContentPageCreateFormSchema.extend({
  ogImageId: optionalImageIdSchema,
})

export type AdminContentPageFormInput = z.infer<typeof AdminContentPageFormSchema>

// Алиасы для обратной совместимости с server actions
export const createContentPageSchema = AdminContentPageFormSchema
export const updateContentPageSchema = AdminContentPageFormSchema.partial()
export type CreateContentPageInput = AdminContentPageFormInput
export type UpdateContentPageInput = z.infer<typeof updateContentPageSchema>
