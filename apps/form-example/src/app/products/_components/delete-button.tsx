'use client'

import { Button } from '@chakra-ui/react'
import { useTransition } from 'react'

export function DeleteButton({ id, deleteAction }: { id: string; deleteAction: (id: string) => Promise<unknown> }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      variant="outline"
      colorPalette="red"
      disabled={isPending}
      onClick={() => {
        if (confirm('Delete this item?')) {
          startTransition(() => void deleteAction(id))
        }
      }}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
