'use client'

import { Box, Button, Checkbox, CloseButton, Dialog, Input, Portal, Stack, Text } from '@chakra-ui/react'
import type { WebhookEventType } from '@letar/driving-school-db/prisma'

import { EVENT_TYPES } from './constants'
import type { CreateWebhookForm } from './types'

interface WebhookCreateDialogProps {
  isOpen: boolean
  onClose: () => void
  form: CreateWebhookForm
  onFormChange: (updates: Partial<CreateWebhookForm>) => void
  onToggleEvent: (event: WebhookEventType) => void
  onCreate: () => Promise<void>
  isCreating: boolean
}

/**
 * Диалог создания нового webhook
 */
export function WebhookCreateDialog({
  isOpen,
  onClose,
  form,
  onFormChange,
  onToggleEvent,
  onCreate,
  isCreating,
}: WebhookCreateDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Создать Webhook</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={1}>
                    Название
                  </Text>
                  <Input
                    placeholder="Например: CRM интеграция"
                    value={form.name}
                    onChange={(e) => onFormChange({ name: e.target.value })}
                  />
                </Box>
                <Box>
                  <Text fontWeight="medium" mb={1}>
                    URL
                  </Text>
                  <Input
                    placeholder="https://example.com/webhook"
                    value={form.url}
                    onChange={(e) => onFormChange({ url: e.target.value })}
                  />
                </Box>
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    События
                  </Text>
                  <Stack gap={2}>
                    {EVENT_TYPES.map((event) => (
                      <Checkbox.Root
                        key={event.value}
                        checked={form.events.includes(event.value)}
                        onCheckedChange={() => onToggleEvent(event.value)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>{event.label}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={onCreate} loading={isCreating}>
                Создать
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
