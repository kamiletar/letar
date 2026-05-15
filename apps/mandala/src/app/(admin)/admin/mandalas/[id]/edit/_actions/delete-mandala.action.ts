'use server'

/**
 * Удаление мандалы.
 * Использует фабрику createDeleteAction.
 */

import { createDeleteAction } from '@/lib/actions'

export const deleteMandala = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')
