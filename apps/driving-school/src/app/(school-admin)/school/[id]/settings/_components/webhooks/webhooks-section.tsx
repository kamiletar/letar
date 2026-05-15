'use client'

/**
 * Секция управления Webhooks в настройках школы
 *
 * Позволяет создавать, редактировать, удалять webhooks
 * и просматривать логи доставки.
 */

import { Button, Card, EmptyState, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuPlus, LuWebhook } from 'react-icons/lu'

import type { WebhooksSectionProps } from './types'
import { useWebhooks } from './use-webhooks'
import { WebhookCreateDialog } from './webhook-create-dialog'
import { WebhookDeleteDialog } from './webhook-delete-dialog'
import { WebhookDetailDialog } from './webhook-detail-dialog'
import { WebhookLogsDialog } from './webhook-logs-dialog'
import { WebhookTable } from './webhook-table'

/**
 * Главный компонент секции webhooks
 */
export function WebhooksSection({ schoolId }: WebhooksSectionProps) {
  const {
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
  } = useWebhooks(schoolId)

  // Состояние загрузки
  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack py={8}>
            <Spinner />
            <Text color="fg.muted">Загрузка webhooks...</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack py={8}>
            <Text color="fg.error">Ошибка: {error}</Text>
            <Button onClick={loadWebhooks}>Повторить</Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <LuWebhook />
            <Heading size="md">Webhooks</Heading>
          </HStack>
          <Button size="sm" onClick={openCreateDialog}>
            <LuPlus />
            Добавить
          </Button>
        </HStack>
      </Card.Header>

      <Card.Body>
        {webhooks.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <LuWebhook />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>Нет webhooks</EmptyState.Title>
                <EmptyState.Description>
                  Создайте webhook для получения уведомлений о событиях в вашей школе
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <WebhookTable
            webhooks={webhooks}
            onOpenDetail={handleOpenDetail}
            onOpenLogs={handleOpenLogs}
            onTest={handleTest}
            onToggleStatus={handleToggleStatus}
            onDelete={openDeleteDialog}
          />
        )}
      </Card.Body>

      {/* Диалоги */}
      <WebhookCreateDialog
        isOpen={isCreateOpen}
        onClose={closeCreateDialog}
        form={createForm}
        onFormChange={updateCreateForm}
        onToggleEvent={toggleEvent}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

      <WebhookDetailDialog
        webhook={detailWebhook}
        isLoading={isLoadingDetail}
        onClose={closeDetailDialog}
        onRegenerateSecret={handleRegenerateSecret}
      />

      <WebhookLogsDialog isOpen={!!logsWebhookId} logs={logs} isLoading={isLoadingLogs} onClose={closeLogsDialog} />

      <WebhookDeleteDialog
        isOpen={!!deleteWebhookId}
        onClose={closeDeleteDialog}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </Card.Root>
  )
}
