'use server'

import { createUpdateAction } from '@/lib/actions/update-action-factory'
import { updateMandalaSchema } from '../../../_schemas/mandala.schema'

/**
 * Обновляет мандалу.
 * Использует фабрику createUpdateAction для унификации логики.
 */
export const updateMandala = createUpdateAction({
  model: 'mandala',
  schema: updateMandalaSchema,
  redirectPath: (id) => `/admin/mandalas/${id}`,
  entityName: 'мандалу',
  uniqueField: 'slug',
  uniqueErrorMessage: 'Мандала с таким slug уже существует',
})
