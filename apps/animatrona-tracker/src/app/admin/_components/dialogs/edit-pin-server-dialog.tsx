'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, CloseButton, Dialog, Field, Input, Portal, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PinServer } from '../types'

interface EditPinServerDialogProps {
  server: PinServer
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Диалог редактирования пин-сервера (название и объём хранилища) */
export function EditPinServerDialog({ server, open, onOpenChange }: EditPinServerDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(server.name)
  const [capacityGb, setCapacityGb] = useState(
    server.capacityBytes > 0 ? String(Math.round(server.capacityBytes / 1024 / 1024 / 1024)) : '',
  )

  const handleSave = async () => {
    setLoading(true)
    try {
      const capacityBytes = capacityGb ? Math.round(parseFloat(capacityGb) * 1024 * 1024 * 1024) : 0
      const res = await fetch(`/api/admin/pin-servers/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, capacityBytes }),
      })

      if (res.ok) {
        toaster.success({ title: 'Сервер обновлён' })
        onOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка обновления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!loading) {
          onOpenChange(e.open)
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Редактировать пин-сервер</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Field.Root>
                  <Field.Label>Название</Field.Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название сервера" />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Объём хранилища (ГБ)</Field.Label>
                  <Input
                    type="number"
                    value={capacityGb}
                    onChange={(e) => setCapacityGb(e.target.value)}
                    placeholder="например, 650"
                    min={0}
                  />
                  <Field.HelperText>Укажите доступный объём в гигабайтах</Field.HelperText>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Отмена
              </Button>
              <Button colorPalette="blue" onClick={handleSave} loading={loading} disabled={!name.trim()}>
                Сохранить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
