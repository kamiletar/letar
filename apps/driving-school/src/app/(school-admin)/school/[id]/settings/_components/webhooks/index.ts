/**
 * Модуль webhooks - управление webhook'ами школы
 */

// Главный компонент
export { WebhooksSection } from './webhooks-section'

// Подкомпоненты (для тестирования и кастомизации)
export { WebhookCreateDialog } from './webhook-create-dialog'
export { WebhookDeleteDialog } from './webhook-delete-dialog'
export { WebhookDetailDialog } from './webhook-detail-dialog'
export { WebhookLogsDialog } from './webhook-logs-dialog'
export { WebhookTable } from './webhook-table'

// Хук
export { useWebhooks } from './use-webhooks'

// Константы и утилиты
export { EVENT_TYPES, getEventLabel } from './constants'

// Типы
export type {
  CreateWebhookForm,
  WebhookDetail,
  WebhookListItem,
  WebhookLogItem,
  WebhooksActions,
  WebhooksSectionProps,
  WebhooksState,
} from './types'
