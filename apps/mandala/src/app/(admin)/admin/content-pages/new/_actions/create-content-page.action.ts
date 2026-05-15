'use server'

import { createCreateAction } from '@/lib/actions/create-action-factory'
import { createContentPageSchema } from '../../_schemas/content-page.schema'

/**
 * Создаёт новую контентную страницу.
 * Использует фабрику createCreateAction для унификации логики.
 */
export const createContentPage = createCreateAction({
  model: 'contentPage',
  schema: createContentPageSchema,
  redirectPath: (id) => `/admin/content-pages/${id}`,
  entityName: 'страницу',
  uniqueField: 'slug',
  uniqueErrorMessage: 'Страница с таким slug уже существует',
  // Трансформация для преобразования пустых строк в null
  transformData: (data) => ({
    slug: data.slug,
    title: data.title,
    content: data.content,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    ogImageId: data.ogImageId || null,
    published: data.published ?? true,
  }),
})
