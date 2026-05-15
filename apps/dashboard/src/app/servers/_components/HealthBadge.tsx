'use client'

/**
 * Бейдж статуса здоровья сервера
 */

import type { ServerInfo } from '@/lib/server-client'
import { Badge, Button, Spinner } from '@chakra-ui/react'

interface HealthBadgeProps {
  server: ServerInfo
  status: boolean | null | undefined
  onCheck: () => void
}

export function HealthBadge({ server, status, onCheck }: HealthBadgeProps) {
  if (server.isLocal) {
    return <Badge colorPalette="blue">Локальный</Badge>
  }

  if (status === null) {
    return <Spinner size="xs" />
  }

  if (status === undefined) {
    return (
      <Button size="xs" variant="ghost" onClick={onCheck}>
        Проверить
      </Button>
    )
  }

  return <Badge colorPalette={status ? 'green' : 'red'}>{status ? 'Онлайн' : 'Офлайн'}</Badge>
}
