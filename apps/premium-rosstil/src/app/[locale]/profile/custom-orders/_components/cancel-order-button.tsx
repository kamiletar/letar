'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'
import { useTransition } from 'react'
import { cancelCustomOrder } from '../_actions/cancel-custom-order'

interface CancelOrderButtonProps {
  orderId: string
  orderNumber: string
}

/**
 * Button with confirmation dialog for cancelling a custom order.
 * Only shown when order status is NEW.
 */
export function CancelOrderButton({ orderId, orderNumber }: CancelOrderButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelCustomOrder(orderId)
      if (result?.error) {
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  return (
    <Dialog.Root role="alertdialog">
      <Dialog.Trigger asChild>
        <Button variant="outline" colorPalette="red" size="sm">
          Отменить заказ
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Отменить заказ?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                Вы уверены, что хотите отменить заказ <strong>#{orderNumber}</strong>?
              </Text>
              <Text color="fg.muted" mt={2}>
                Это действие нельзя отменить.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Нет, оставить</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={handleCancel} loading={isPending}>
                Да, отменить
              </Button>
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
