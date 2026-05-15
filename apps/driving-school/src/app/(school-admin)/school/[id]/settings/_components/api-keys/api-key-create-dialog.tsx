'use client'

import {
  Alert,
  Box,
  Button,
  Clipboard,
  CloseButton,
  Code,
  Dialog,
  HStack,
  IconButton,
  Input,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { LuCopy } from 'react-icons/lu'

interface ApiKeyCreateDialogProps {
  isOpen: boolean
  onClose: () => void
  keyName: string
  onKeyNameChange: (name: string) => void
  onCreate: () => Promise<void>
  isCreating: boolean
  createdKey: string | null
}

/**
 * Диалог создания API-ключа
 * Показывает форму создания или сгенерированный ключ
 */
export function ApiKeyCreateDialog({
  isOpen,
  onClose,
  keyName,
  onKeyNameChange,
  onCreate,
  isCreating,
  createdKey,
}: ApiKeyCreateDialogProps) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          onClose()
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{createdKey ? 'Ключ создан' : 'Создать API-ключ'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {createdKey ? (
                <Stack gap={4}>
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Сохраните ключ!</Alert.Title>
                      <Alert.Description>
                        Этот ключ показывается только один раз. Скопируйте его сейчас и сохраните в надёжном месте.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>

                  <Box p={4} bg="bg.muted" borderRadius="md">
                    <Clipboard.Root value={createdKey}>
                      <HStack justify="space-between">
                        <Code size="sm" wordBreak="break-all">
                          {createdKey}
                        </Code>
                        <Clipboard.Trigger asChild>
                          <IconButton aria-label="Скопировать" variant="ghost" size="sm">
                            <Clipboard.Indicator copied={<LuCopy />}>
                              <LuCopy />
                            </Clipboard.Indicator>
                          </IconButton>
                        </Clipboard.Trigger>
                      </HStack>
                    </Clipboard.Root>
                  </Box>
                </Stack>
              ) : (
                <Stack gap={4}>
                  <Text color="fg.muted">
                    Введите название для ключа, чтобы было проще его идентифицировать (например: «Production», «CRM
                    Integration», «Development»).
                  </Text>
                  <Input
                    placeholder="Название ключа"
                    value={keyName}
                    onChange={(e) => onKeyNameChange(e.target.value)}
                    autoFocus
                  />
                </Stack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              {createdKey ? (
                <Button colorPalette="brand" onClick={onClose}>
                  Готово
                </Button>
              ) : (
                <>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Отмена</Button>
                  </Dialog.ActionTrigger>
                  <Button colorPalette="brand" onClick={onCreate} loading={isCreating} loadingText="Создание...">
                    Создать
                  </Button>
                </>
              )}
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
