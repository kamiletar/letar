'use server'

/**
 * Массовые операции для контент-страниц.
 * Использует фабрику createBulkActions.
 */

import { createBulkActions } from '@/lib/actions'

const { bulkPublish, bulkUnpublish, bulkDelete } = createBulkActions('contentPage', '/admin/content-pages')

/** Массовая публикация страниц */
export { bulkPublish as bulkPublishContentPages }

/** Массовое скрытие страниц */
export { bulkUnpublish as bulkUnpublishContentPages }

/** Массовое удаление страниц */
export { bulkDelete as bulkDeleteContentPages }
