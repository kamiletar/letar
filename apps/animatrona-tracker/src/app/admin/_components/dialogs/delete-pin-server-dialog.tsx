'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Button, CloseButton, Dialog, HStack, Portal, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PinServer } from '../types'

interface DeletePinServerDialogProps {
  /** Сервер для удаления */
  server: PinServer
  /** Открыт ли диалог */
  open: boolean
  /** Колбэк изменения состояния */
  onOpenChange: (open: boolean) => void
}

/** Диалог подтверждения удаления пин-сервера */
export function DeletePinServerDialog({ server, open, onOpenChange }: DeletePinServerDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/pin-servers/${server.id}`, { method: 'DELETE' })

      if (res.ok) {
        const data = await res.json()
        toaster.success({
          title: 'Сервер удалён',
          description: `Отменено заданий: ${data.cancelledJobs}, удалено: ${data.deletedJobs}`,
        })
        onOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка удаления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Удалить пин-сервер</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={3}>
                <Text>
                  Вы уверены, что хотите удалить сервер <strong>{server.name}</strong>?
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  URL: <code>{server.apiUrl}</code>
                </Text>
                <HStack gap={2}>
                  <Text fontSize="sm">Всего заданий:</Text>
                  <Badge colorPalette="gray">{server._count.pinJobs}</Badge>
                </HStack>
                <Text fontSize="sm" color="fg.warning">
                  Все задания этого сервера будут удалены. Активные задания (QUEUED/PINNING) будут отменены на
                  pin-queue.
                </Text>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button colorPalette="red" onClick={handleDelete} loading={loading}>
                Удалить сервер
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
