'use server'

/**
 * Удаление контент-страницы.
 * Использует фабрику createDeleteAction.
 */

import { createDeleteAction } from '@/lib/actions'

export const deleteContentPage = createDeleteAction('contentPage', '/admin/content-pages', 'страницу')
