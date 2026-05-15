'use server'

import { createUpdateAction } from '@/lib/actions/update-action-factory'
import { updateContentPageSchema } from '../../../_schemas/content-page.schema'

/**
 * Обновляет контентную страницу.
 * Использует фабрику createUpdateAction для унификации логики.
 */
export const updateContentPage = createUpdateAction({
  model: 'contentPage',
  schema: updateContentPageSchema,
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
    published: data.published,
  }),
})
