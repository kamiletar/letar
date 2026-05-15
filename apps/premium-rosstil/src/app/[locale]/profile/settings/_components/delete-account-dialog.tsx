'use client'

import { Button, Dialog, Portal } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { FaExclamationTriangle, FaTrash } from 'react-icons/fa'
import { deleteAccount } from '../_actions/delete-account'

/**
 * Диалог подтверждения удаления аккаунта.
 *
 * GDPR-compliant функция удаления аккаунта:
 * - Показывает предупреждение об удалении всех данных
 * - Требует подтверждения действия
 * - Выполняет удаление через server action
 * - Cascade удаляет все связанные данные пользователя
 */
export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteAccount()
        // После успешного удаления произойдет редирект на главную страницу
      } catch (error) {
        console.error('Failed to delete account:', error)
        // В реальном приложении здесь должен быть toast с ошибкой
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button colorPalette="red" variant="outline" size="lg">
          <FaTrash />
          Удалить аккаунт
        </Button>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title display="flex" alignItems="center" gap={2}>
                <FaExclamationTriangle color="red" />
                Удалить аккаунт
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Внимание!</strong> Это действие нельзя отменить.
              </p>
              <p style={{ marginBottom: '0.5rem' }}>При удалении аккаунта будут безвозвратно удалены:</p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Все ваши заказы и история покупок</li>
                <li>Корзина и список избранного</li>
                <li>Сохраненные адреса доставки</li>
                <li>Ваши замеры и предпочтения</li>
                <li>Настройки уведомлений</li>
                <li>Связанные OAuth аккаунты</li>
              </ul>
              <p>Вы уверены, что хотите удалить свой аккаунт?</p>
            </Dialog.Body>

            <Dialog.Footer display="flex" gap={3}>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={handleDelete} loading={isPending} loadingText="Удаление...">
                Удалить аккаунт навсегда
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
