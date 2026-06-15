'use client'

import { Button } from '@chakra-ui/react'
import { useTransition } from 'react'
import { deleteClientAction } from '../../_actions/client.action'

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Удалить клиент "${clientId}"? Это действие необратимо.`)) {return}
    startTransition(() => deleteClientAction(clientId))
  }

  return (
    <Button size="sm" variant="outline" colorPalette="red" loading={isPending} onClick={handleDelete}>
      Удалить
    </Button>
  )
}
