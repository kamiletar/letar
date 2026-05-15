'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, CloseButton, Dialog, Portal, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useRouter } from 'next/navigation'
import { type z } from 'zod/v4'
import { AddPinServerSchema } from '../../_schemas/add-pin-server.schema'

interface AddPinServerDialogProps {
  /** Открыт ли диалог */
  open: boolean
  /** Колбэк изменения состояния */
  onOpenChange: (open: boolean) => void
}

/** Диалог добавления нового пин-сервера */
export function AddPinServerDialog({ open, onOpenChange }: AddPinServerDialogProps) {
  const router = useRouter()

  const handleSubmit = async (data: z.infer<typeof AddPinServerSchema>) => {
    const body = {
      name: data.name,
      apiUrl: data.apiUrl,
      peerId: data.peerId || undefined,
      authSecret: data.authSecret || undefined,
      capacityBytes: data.capacityGb ? data.capacityGb * 1024 * 1024 * 1024 : undefined,
    }

    try {
      const res = await fetch('/api/admin/pin-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toaster.success({ title: 'Сервер добавлен' })
        onOpenChange(false)
        router.refresh()
      } else {
        const resData = await res.json().catch(() => ({}))
        toaster.error({ title: resData.error || 'Ошибка добавления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Добавить пин-сервер</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Form
              schema={AddPinServerSchema}
              initialValue={{ name: '', apiUrl: '', peerId: '', authSecret: '', capacityGb: undefined }}
              onSubmit={handleSubmit}
            >
              <Dialog.Body>
                <VStack gap={4}>
                  <Form.Field.String name="name" />
                  <Form.Field.String name="apiUrl" />
                  <Form.Field.String name="peerId" />
                  <Form.Field.Password name="authSecret" />
                  <Form.Field.Number name="capacityGb" />
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Отмена
                </Button>
                <Form.Button.Submit colorPalette="green">Добавить</Form.Button.Submit>
              </Dialog.Footer>
            </Form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
