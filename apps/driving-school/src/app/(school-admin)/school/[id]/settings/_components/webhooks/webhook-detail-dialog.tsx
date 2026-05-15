'use client'

import {
  Badge,
  Box,
  Clipboard,
  CloseButton,
  Code,
  Dialog,
  HStack,
  IconButton,
  Portal,
  Spinner,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { LuCopy, LuRefreshCw } from 'react-icons/lu'

import { EVENT_TYPES } from './constants'
import type { WebhookDetail } from './types'

interface WebhookDetailDialogProps {
  webhook: WebhookDetail | null
  isLoading: boolean
  onClose: () => void
  onRegenerateSecret: (webhookId: string) => Promise<void>
}

/**
 * Диалог просмотра деталей webhook
 */
export function WebhookDetailDialog({ webhook, isLoading, onClose, onRegenerateSecret }: WebhookDetailDialogProps) {
  return (
    <Dialog.Root open={!!webhook} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>Детали Webhook</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              {isLoading ? (
                <VStack py={8}>
                  <Spinner />
                </VStack>
              ) : webhook ? (
                <Stack gap={4}>
                  <Box>
                    <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                      Название
                    </Text>
                    <Text>{webhook.name}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                      URL
                    </Text>
                    <Code fontSize="sm" wordBreak="break-all">
                      {webhook.url}
                    </Code>
                  </Box>
                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                        Секретный ключ
                      </Text>
                      <HStack gap={1}>
                        <Clipboard.Root value={webhook.secret}>
                          <Clipboard.Trigger asChild>
                            <IconButton aria-label="Копировать" variant="ghost" size="xs">
                              <LuCopy />
                            </IconButton>
                          </Clipboard.Trigger>
                        </Clipboard.Root>
                        <IconButton
                          aria-label="Регенерировать"
                          variant="ghost"
                          size="xs"
                          onClick={() => onRegenerateSecret(webhook.id)}
                        >
                          <LuRefreshCw />
                        </IconButton>
                      </HStack>
                    </HStack>
                    <Code fontSize="sm" wordBreak="break-all">
                      {webhook.secret}
                    </Code>
                  </Box>
                  <Box>
                    <Text fontWeight="medium" color="fg.muted" fontSize="sm" mb={1}>
                      Подписка на события
                    </Text>
                    <HStack gap={1} flexWrap="wrap">
                      {webhook.events.map((event) => (
                        <Badge key={event} size="sm">
                          {EVENT_TYPES.find((e) => e.value === event)?.label || event}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                  <HStack gap={8}>
                    <Box>
                      <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                        Успешных доставок
                      </Text>
                      <Text color="green.500" fontWeight="bold">
                        {webhook.successCount}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                        Ошибок
                      </Text>
                      <Text color="red.500" fontWeight="bold">
                        {webhook.failureCount}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                        Подряд ошибок
                      </Text>
                      <Text fontWeight="bold">{webhook.consecutiveFailures}</Text>
                    </Box>
                  </HStack>
                </Stack>
              ) : null}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
