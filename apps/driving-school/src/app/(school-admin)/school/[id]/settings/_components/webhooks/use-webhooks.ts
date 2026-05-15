'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { WebhookEventType } from '@letar/driving-school-db/prisma'
import { useCallback, useEffect, useState } from 'react'

import {
  createWebhookAction,
  deleteWebhookAction,
  getWebhookDetailAction,
  getWebhookLogsAction,
  getWebhooksAction,
  regenerateWebhookSecretAction,
  testWebhookAction,
  updateWebhookAction,
} from '../../_actions/webhook.action'
import type { CreateWebhookForm, WebhooksActions, WebhooksState } from './types'

/**
 * Хук для управления состоянием webhooks
 * Инкапсулирует всю логику работы с webhooks
 */
export function useWebhooks(schoolId: string): WebhooksState & WebhooksActions {
  // Основное состояние
  const [webhooks, setWebhooks] = useState<WebhooksState['webhooks']>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Состояние диалога создания
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateWebhookForm>({
    name: '',
    url: '',
    events: [],
  })
  const [isCreating, setIsCreating] = useState(false)

  // Состояние диалога деталей
  const [detailWebhook, setDetailWebhook] = useState<WebhooksState['detailWebhook']>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Состояние диалога логов
  const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null)
  const [logs, setLogs] = useState<WebhooksState['logs']>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  // Состояние диалога удаления
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Загрузка списка webhooks
  const loadWebhooks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getWebhooksAction(schoolId)

    if (result.success) {
      setWebhooks(result.webhooks)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [schoolId])

  // Загружаем при монтировании
  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  // Создание webhook
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toaster.error({ title: 'Введите название' })
      return
    }
    if (!createForm.url.trim()) {
      toaster.error({ title: 'Введите URL' })
      return
    }
    if (createForm.events.length === 0) {
      toaster.error({ title: 'Выберите хотя бы одно событие' })
      return
    }

    setIsCreating(true)

    const result = await createWebhookAction({
      organizationId: schoolId,
      name: createForm.name,
      url: createForm.url,
      events: createForm.events,
    })

    if (result.success) {
      setWebhooks((prev) => [result.webhook, ...prev])
      setIsCreateOpen(false)
      setCreateForm({ name: '', url: '', events: [] })
      toaster.success({ title: 'Webhook создан' })
    } else {
      toaster.error({ title: 'Ошибка создания webhook' })
    }

    setIsCreating(false)
  }

  // Открытие деталей
  const handleOpenDetail = async (webhookId: string) => {
    setIsLoadingDetail(true)

    const result = await getWebhookDetailAction(webhookId)

    if (result.success) {
      setDetailWebhook(result.webhook)
    } else {
      toaster.error({ title: 'Ошибка загрузки деталей' })
    }

    setIsLoadingDetail(false)
  }

  // Переключение статуса
  const handleToggleStatus = async (webhook: WebhooksState['webhooks'][0]) => {
    const newStatus = webhook.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

    const result = await updateWebhookAction({
      webhookId: webhook.id,
      status: newStatus,
    })

    if (result.success) {
      setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? { ...w, status: newStatus } : w)))
      toaster.success({ title: newStatus === 'ACTIVE' ? 'Webhook активирован' : 'Webhook приостановлен' })
    } else {
      toaster.error({ title: 'Ошибка изменения статуса' })
    }
  }

  // Тестирование webhook
  const handleTest = async (webhookId: string) => {
    toaster.info({ title: 'Отправка тестового запроса...' })

    const result = await testWebhookAction({ webhookId })

    if (result.success) {
      toaster.success({
        title: 'Тест успешен',
        description: `HTTP ${result.statusCode} за ${result.responseTimeMs}мс`,
      })
    } else {
      toaster.error({
        title: 'Тест не прошёл',
        description: result.error,
      })
    }
  }

  // Регенерация секрета
  const handleRegenerateSecret = async (webhookId: string) => {
    const result = await regenerateWebhookSecretAction(webhookId)

    if (result.success) {
      if (detailWebhook && detailWebhook.id === webhookId) {
        setDetailWebhook({ ...detailWebhook, secret: result.secret })
      }
      toaster.success({ title: 'Секретный ключ обновлён' })
    } else {
      toaster.error({ title: 'Ошибка регенерации ключа' })
    }
  }

  // Загрузка логов
  const handleOpenLogs = async (webhookId: string) => {
    setLogsWebhookId(webhookId)
    setIsLoadingLogs(true)

    const result = await getWebhookLogsAction(webhookId, { limit: 50 })

    if (result.success) {
      setLogs(result.logs)
    } else {
      toaster.error({ title: 'Ошибка загрузки логов' })
    }

    setIsLoadingLogs(false)
  }

  // Удаление webhook
  const handleDelete = async () => {
    if (!deleteWebhookId) {
      return
    }

    setIsDeleting(true)

    const result = await deleteWebhookAction({ webhookId: deleteWebhookId })

    if (result.success) {
      setWebhooks((prev) => prev.filter((w) => w.id !== deleteWebhookId))
      setDeleteWebhookId(null)
      toaster.success({ title: 'Webhook удалён' })
    } else {
      toaster.error({ title: 'Ошибка удаления webhook' })
    }

    setIsDeleting(false)
  }

  // Переключение события в форме создания
  const toggleEvent = (event: WebhookEventType) => {
    setCreateForm((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }))
  }

  // Обновление формы создания
  const updateCreateForm = (updates: Partial<CreateWebhookForm>) => {
    setCreateForm((prev) => ({ ...prev, ...updates }))
  }

  // Управление диалогами
  const openCreateDialog = () => setIsCreateOpen(true)
  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreateForm({ name: '', url: '', events: [] })
  }
  const closeDetailDialog = () => setDetailWebhook(null)
  const closeLogsDialog = () => setLogsWebhookId(null)
  const openDeleteDialog = (webhookId: string) => setDeleteWebhookId(webhookId)
  const closeDeleteDialog = () => setDeleteWebhookId(null)

  return {
    // State
    webhooks,
    isLoading,
    error,
    isCreateOpen,
    createForm,
    isCreating,
    detailWebhook,
    isLoadingDetail,
    logsWebhookId,
    logs,
    isLoadingLogs,
    deleteWebhookId,
    isDeleting,
    // Actions
    loadWebhooks,
    handleCreate,
    handleOpenDetail,
    handleToggleStatus,
    handleTest,
    handleRegenerateSecret,
    handleOpenLogs,
    handleDelete,
    toggleEvent,
    updateCreateForm,
    openCreateDialog,
    closeCreateDialog,
    closeDetailDialog,
    closeLogsDialog,
    openDeleteDialog,
    closeDeleteDialog,
  }
}
