'use client'

import { Box, Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { TriggerConfirmDialog } from './confirm-dialog'

export interface DeleteAccountZoneProps {
  /** Server action для удаления аккаунта, должна бросать или возвращать { ok, error } */
  onDelete: () => Promise<{ ok: boolean; error?: string }>
  /** URL редиректа после успешного удаления */
  redirectUrl?: string
}

/** Секция «Опасная зона» с подтверждаемым удалением аккаунта (152-ФЗ ст. 21) */
export function DeleteAccountZone({ onDelete, redirectUrl = '/sign-in' }: DeleteAccountZoneProps) {
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    const result = await onDelete()
    if (!result.ok) {
      setError(result.error ?? 'Ошибка удаления аккаунта')
      return
    }
    window.location.href = redirectUrl
  }

  return (
    <Box borderWidth="1px" borderColor="red.200" _dark={{ borderColor: 'red.800' }} borderRadius="md" p={4}>
      <Stack gap={3}>
        <Text fontWeight="medium">Удаление аккаунта</Text>
        <Text fontSize="sm" color="fg.muted">
          Аккаунт и личные данные будут удалены безвозвратно. Данные, необходимые для финансовой отчётности, сохраняются
          без привязки к личности.
        </Text>
        {error && (
          <Text fontSize="sm" color="red.500">
            {error}
          </Text>
        )}
        <TriggerConfirmDialog
          trigger={
            <Button alignSelf="flex-start" colorPalette="red" variant="outline" size="sm">
              Удалить аккаунт
            </Button>
          }
          title="Удалить аккаунт?"
          description="Это действие нельзя отменить. Все ваши данные будут удалены безвозвратно."
          confirmText="Удалить навсегда"
          colorPalette="red"
          onConfirm={handleConfirm}
        />
      </Stack>
    </Box>
  )
}
