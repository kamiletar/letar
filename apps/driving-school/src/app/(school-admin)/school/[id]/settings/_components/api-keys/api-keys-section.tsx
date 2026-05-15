'use client'

/**
 * Секция управления API-ключами в настройках школы
 *
 * Позволяет создавать, отзывать и удалять API-ключи
 * для доступа к Public API школы.
 */

import { Alert, Button, Card, Code, EmptyState, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuKey, LuPlus } from 'react-icons/lu'

import { ApiKeyCreateDialog } from './api-key-create-dialog'
import { ApiKeyDeleteDialog } from './api-key-delete-dialog'
import { ApiKeyRevokeDialog } from './api-key-revoke-dialog'
import { ApiKeyTable } from './api-key-table'
import type { ApiKeysSectionProps } from './types'
import { useApiKeys } from './use-api-keys'

/**
 * Главный компонент секции API-ключей
 */
export function ApiKeysSection({ schoolId }: ApiKeysSectionProps) {
  const {
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
  } = useApiKeys(schoolId)

  // Состояние загрузки
  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack py={8}>
            <Spinner size="lg" />
            <Text color="fg.muted">Загрузка API-ключей...</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Ошибка загрузки</Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  return (
    <>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Heading size="md">API-ключи</Heading>
              <Text color="fg.muted" fontSize="sm">
                Управление ключами для доступа к Public API школы
              </Text>
            </VStack>
            <Button colorPalette="brand" size="sm" onClick={openCreateDialog}>
              <LuPlus />
              Создать ключ
            </Button>
          </HStack>
        </Card.Header>

        <Card.Body pt={0}>
          {apiKeys.length === 0 ? (
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <LuKey />
                </EmptyState.Indicator>
                <EmptyState.Title>Нет API-ключей</EmptyState.Title>
                <EmptyState.Description>Создайте ключ для интеграции с внешними системами</EmptyState.Description>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <ApiKeyTable apiKeys={apiKeys} onRevoke={openRevokeDialog} onDelete={openDeleteDialog} />
          )}
        </Card.Body>

        <Card.Footer>
          <Text color="fg.muted" fontSize="xs">
            Максимум 10 активных ключей на школу. Ключи используются для доступа к <Code size="sm">/api/v1/*</Code>{' '}
            эндпоинтам.
          </Text>
        </Card.Footer>
      </Card.Root>

      {/* Диалоги */}
      <ApiKeyCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        keyName={newKeyName}
        onKeyNameChange={setNewKeyName}
        onCreate={handleCreateKey}
        isCreating={isCreating}
        createdKey={createdKey}
      />

      <ApiKeyRevokeDialog
        isOpen={!!revokeKeyId}
        onClose={closeRevokeDialog}
        onRevoke={handleRevokeKey}
        isRevoking={isRevoking}
      />

      <ApiKeyDeleteDialog
        isOpen={!!deleteKeyId}
        onClose={closeDeleteDialog}
        onDelete={handleDeleteKey}
        isDeleting={isDeleting}
      />
    </>
  )
}
