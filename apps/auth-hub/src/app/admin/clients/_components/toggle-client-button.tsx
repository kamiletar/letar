'use client'

import { Button } from '@chakra-ui/react'
import { useTransition } from 'react'
import { toggleClientDisabled } from '../_actions/toggle-client.action'

interface ToggleClientButtonProps {
  clientId: string
  disabled: boolean
}

export function ToggleClientButton({ clientId, disabled }: ToggleClientButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      size="xs"
      variant="outline"
      colorPalette={disabled ? 'green' : 'red'}
      loading={isPending}
      onClick={() => startTransition(() => toggleClientDisabled(clientId, disabled))}
    >
      {disabled ? 'Включить' : 'Отключить'}
    </Button>
  )
}
