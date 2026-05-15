/**
 * Модуль api-keys - управление API-ключами школы
 */

// Главный компонент
export { ApiKeysSection } from './api-keys-section'

// Подкомпоненты
export { ApiKeyCreateDialog } from './api-key-create-dialog'
export { ApiKeyDeleteDialog } from './api-key-delete-dialog'
export { ApiKeyRevokeDialog } from './api-key-revoke-dialog'
export { ApiKeyTable } from './api-key-table'

// Хук
export { useApiKeys } from './use-api-keys'

// Типы
export type { ApiKeyItem, ApiKeysActions, ApiKeysSectionProps, ApiKeysState } from './types'
