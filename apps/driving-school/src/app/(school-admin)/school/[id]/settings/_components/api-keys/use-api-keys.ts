'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useCallback, useEffect, useState } from 'react'

import {
  createApiKeyAction,
  deleteApiKeyAction,
  getApiKeysAction,
  revokeApiKeyAction,
} from '../../_actions/api-key.action'
import type { ApiKeysActions, ApiKeysState } from './types'

/**
 * Хук для управления состоянием API-ключей
 * Инкапсулирует всю логику работы с ключами
 */
export function useApiKeys(schoolId: string): ApiKeysState & ApiKeysActions {
  // Основное состояние
  const [apiKeys, setApiKeys] = useState<ApiKeysState['apiKeys']>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Состояние диалога создания
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // Состояние диалога отзыва
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  // Состояние диалога удаления
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Загрузка ключей
  const loadApiKeys = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getApiKeysAction(schoolId)

    if (result.success) {
      setApiKeys(result.apiKeys)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [schoolId])

  // Загружаем при монтировании
  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  // Создание ключа
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toaster.error({ title: 'Введите название ключа' })
      return
    }

    setIsCreating(true)

    const result = await createApiKeyAction(schoolId, newKeyName)

    if (result.success) {
      setCreatedKey(result.fullKey)
      setApiKeys((prev) => [result.apiKey, ...prev])
      toaster.success({ title: 'API-ключ создан' })
    } else {
      const errorMessages: Record<string, string> = {
        NOT_ADMIN: 'Только администратор может создавать ключи',
        LIMIT_EXCEEDED: 'Достигнут лимит ключей (максимум 10)',
        UNKNOWN_ERROR: 'Произошла ошибка',
      }
      toaster.error({ title: errorMessages[result.error] || 'Ошибка создания ключа' })
    }

    setIsCreating(false)
  }

  // Закрытие диалога создания
  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setNewKeyName('')
    setCreatedKey(null)
  }

  // Отзыв ключа
  const handleRevokeKey = async () => {
    if (!revokeKeyId) {
      return
    }

    setIsRevoking(true)

    const result = await revokeApiKeyAction(schoolId, revokeKeyId)

    if (result.success) {
      setApiKeys((prev) => prev.map((key) => (key.id === revokeKeyId ? { ...key, status: 'REVOKED' as const } : key)))
      toaster.success({ title: 'API-ключ отозван' })
    } else {
      toaster.error({ title: 'Ошибка отзыва ключа' })
    }

    setRevokeKeyId(null)
    setIsRevoking(false)
  }

  // Удаление ключа
  const handleDeleteKey = async () => {
    if (!deleteKeyId) {
      return
    }

    setIsDeleting(true)

    const result = await deleteApiKeyAction(schoolId, deleteKeyId)

    if (result.success) {
      setApiKeys((prev) => prev.filter((key) => key.id !== deleteKeyId))
      toaster.success({ title: 'API-ключ удалён' })
    } else {
      const errorMessages: Record<string, string> = {
        MUST_REVOKE_FIRST: 'Сначала отзовите ключ',
        UNKNOWN_ERROR: 'Произошла ошибка',
      }
      toaster.error({ title: errorMessages[result.error] || 'Ошибка удаления ключа' })
    }

    setDeleteKeyId(null)
    setIsDeleting(false)
  }

  // Управление диалогами
  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const openRevokeDialog = (keyId: string) => setRevokeKeyId(keyId)
  const closeRevokeDialog = () => setRevokeKeyId(null)
  const openDeleteDialog = (keyId: string) => setDeleteKeyId(keyId)
  const closeDeleteDialog = () => setDeleteKeyId(null)

  return {
    // State
    apiKeys,
    isLoading,
    error,
    isCreateDialogOpen,
    newKeyName,
    isCreating,
    createdKey,
    revokeKeyId,
    isRevoking,
    deleteKeyId,
    isDeleting,
    // Actions
    loadApiKeys,
    handleCreateKey,
    handleCloseCreateDialog,
    handleRevokeKey,
    handleDeleteKey,
    openCreateDialog,
    setNewKeyName,
    openRevokeDialog,
    closeRevokeDialog,
    openDeleteDialog,
    closeDeleteDialog,
  }
}
