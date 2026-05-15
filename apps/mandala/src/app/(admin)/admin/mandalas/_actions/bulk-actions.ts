'use server'

/**
 * Массовые операции для мандал.
 * Использует фабрику createBulkActions.
 */

import { createBulkActions } from '@/lib/actions'

const { bulkPublish, bulkUnpublish, bulkDelete } = createBulkActions('mandala', '/admin/mandalas')

/** Массовая публикация мандал */
export { bulkPublish as bulkPublishMandalas }

/** Массовое скрытие мандал */
export { bulkUnpublish as bulkUnpublishMandalas }

/** Массовое удаление мандал */
export { bulkDelete as bulkDeleteMandalas }
