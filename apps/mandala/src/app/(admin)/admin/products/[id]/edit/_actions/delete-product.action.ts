'use server'

/**
 * Удаление товара.
 * Использует фабрику createDeleteAction.
 */

import { createDeleteAction } from '@/lib/actions'

export const deleteProduct = createDeleteAction('product', '/admin/products', 'товар')
