'use server'

import { createCreateAction } from '@/lib/actions/create-action-factory'
import { createMandalaSchema } from '../../_schemas/mandala.schema'

/**
 * Создаёт новую мандалу.
 * Использует фабрику createCreateAction для унификации логики.
 */
export const createMandala = createCreateAction({
  model: 'mandala',
  schema: createMandalaSchema,
  redirectPath: (id) => `/admin/mandalas/${id}`,
  entityName: 'мандалу',
  uniqueField: 'slug',
  uniqueErrorMessage: 'Мандала с таким slug уже существует',
})
