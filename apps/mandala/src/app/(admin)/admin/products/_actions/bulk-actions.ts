'use server'

/**
 * Массовые операции для товаров.
 * Использует фабрику createBulkActions.
 */

import { createBulkActions } from '@/lib/actions'

const { bulkPublish, bulkUnpublish, bulkDelete } = createBulkActions('product', '/admin/products')

/** Массовая публикация товаров */
export { bulkPublish as bulkPublishProducts }

/** Массовое скрытие товаров */
export { bulkUnpublish as bulkUnpublishProducts }

/** Массовое удаление товаров */
export { bulkDelete as bulkDeleteProducts }
