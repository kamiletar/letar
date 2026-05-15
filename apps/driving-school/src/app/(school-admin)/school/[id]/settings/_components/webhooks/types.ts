import type { WebhookEventType } from '@letar/driving-school-db/prisma'

import type { WebhookDetail, WebhookListItem, WebhookLogItem } from '../../_actions/webhook.action'

/**
 * Типы для webhooks компонентов
 */

/** Props для главной секции */
export interface WebhooksSectionProps {
  schoolId: string
}

/** Состояние формы создания webhook */
export interface CreateWebhookForm {
  name: string
  url: string
  events: WebhookEventType[]
}

/** Состояние хука useWebhooks */
export interface WebhooksState {
  /** Список webhooks */
  webhooks: WebhookListItem[]
  /** Флаг загрузки списка */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
  /** Открыт ли диалог создания */
  isCreateOpen: boolean
  /** Данные формы создания */
  createForm: CreateWebhookForm
  /** Флаг процесса создания */
  isCreating: boolean
  /** Детали выбранного webhook */
  detailWebhook: WebhookDetail | null
  /** Флаг загрузки деталей */
  isLoadingDetail: boolean
  /** ID webhook для просмотра логов */
  logsWebhookId: string | null
  /** Список логов */
  logs: WebhookLogItem[]
  /** Флаг загрузки логов */
  isLoadingLogs: boolean
  /** ID webhook для удаления */
  deleteWebhookId: string | null
  /** Флаг процесса удаления */
  isDeleting: boolean
}

/** Действия хука useWebhooks */
export interface WebhooksActions {
  /** Загрузить список webhooks */
  loadWebhooks: () => Promise<void>
  /** Создать webhook */
  handleCreate: () => Promise<void>
  /** Открыть детали webhook */
  handleOpenDetail: (webhookId: string) => Promise<void>
  /** Переключить статус webhook */
  handleToggleStatus: (webhook: WebhookListItem) => Promise<void>
  /** Отправить тестовый запрос */
  handleTest: (webhookId: string) => Promise<void>
  /** Регенерировать секретный ключ */
  handleRegenerateSecret: (webhookId: string) => Promise<void>
  /** Открыть логи webhook */
  handleOpenLogs: (webhookId: string) => Promise<void>
  /** Удалить webhook */
  handleDelete: () => Promise<void>
  /** Переключить событие в форме создания */
  toggleEvent: (event: WebhookEventType) => void
  /** Обновить форму создания */
  updateCreateForm: (updates: Partial<CreateWebhookForm>) => void
  /** Открыть диалог создания */
  openCreateDialog: () => void
  /** Закрыть диалог создания */
  closeCreateDialog: () => void
  /** Закрыть диалог деталей */
  closeDetailDialog: () => void
  /** Закрыть диалог логов */
  closeLogsDialog: () => void
  /** Открыть диалог удаления */
  openDeleteDialog: (webhookId: string) => void
  /** Закрыть диалог удаления */
  closeDeleteDialog: () => void
}

// Реэкспорт типов из actions для удобства
export type { WebhookDetail, WebhookListItem, WebhookLogItem }
