import type { ApiKeyItem } from '../../_actions/api-key.action'

/**
 * Типы для api-keys компонентов
 */

/** Props для главной секции */
export interface ApiKeysSectionProps {
  schoolId: string
}

/** Состояние хука useApiKeys */
export interface ApiKeysState {
  /** Список API-ключей */
  apiKeys: ApiKeyItem[]
  /** Флаг загрузки списка */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
  /** Открыт ли диалог создания */
  isCreateDialogOpen: boolean
  /** Название нового ключа */
  newKeyName: string
  /** Флаг процесса создания */
  isCreating: boolean
  /** Созданный ключ (показывается только один раз) */
  createdKey: string | null
  /** ID ключа для отзыва */
  revokeKeyId: string | null
  /** Флаг процесса отзыва */
  isRevoking: boolean
  /** ID ключа для удаления */
  deleteKeyId: string | null
  /** Флаг процесса удаления */
  isDeleting: boolean
}

/** Действия хука useApiKeys */
export interface ApiKeysActions {
  /** Загрузить список ключей */
  loadApiKeys: () => Promise<void>
  /** Создать ключ */
  handleCreateKey: () => Promise<void>
  /** Закрыть диалог создания */
  handleCloseCreateDialog: () => void
  /** Отозвать ключ */
  handleRevokeKey: () => Promise<void>
  /** Удалить ключ */
  handleDeleteKey: () => Promise<void>
  /** Открыть диалог создания */
  openCreateDialog: () => void
  /** Установить название нового ключа */
  setNewKeyName: (name: string) => void
  /** Открыть диалог отзыва */
  openRevokeDialog: (keyId: string) => void
  /** Закрыть диалог отзыва */
  closeRevokeDialog: () => void
  /** Открыть диалог удаления */
  openDeleteDialog: (keyId: string) => void
  /** Закрыть диалог удаления */
  closeDeleteDialog: () => void
}

// Реэкспорт типов из actions
export type { ApiKeyItem }
