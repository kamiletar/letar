'use client'

import { Button, HStack, Text } from '@chakra-ui/react'
import { LuLink, LuRefreshCw } from 'react-icons/lu'

import { useSyncRelations } from '../../lib/franchise'
import { Tooltip } from '../ui/tooltip'

interface SyncRelationsButtonProps {
  /** ID аниме в локальной БД */
  animeId: string
  /** Shikimori ID для поиска связей */
  shikimoriId: number | null
  /** Компактный режим (только иконка) */
  compact?: boolean
  /** Callback после успешной синхронизации */
  onSuccess?: () => void
}

/**
 * Кнопка для синхронизации связей аниме из Shikimori
 */
export function SyncRelationsButton({ animeId, shikimoriId, compact = false, onSuccess }: SyncRelationsButtonProps) {
  const { syncRelations, isSyncing, error } = useSyncRelations()

  const handleSync = async () => {
    if (!shikimoriId) {
      return
    }
    const success = await syncRelations(animeId, shikimoriId)
    if (success) {
      onSuccess?.()
    }
  }

  // Нет shikimoriId — кнопка неактивна
  if (!shikimoriId) {
    return (
      <Tooltip content="Необходим ID Shikimori для поиска связей">
        <Button size="sm" variant="ghost" disabled>
          <LuLink />
          {!compact && <Text>Нет ID</Text>}
        </Button>
      </Tooltip>
    )
  }

  if (compact) {
    return (
      <Tooltip content={error || 'Найти связанные аниме'}>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSync}
          loading={isSyncing}
          colorPalette={error ? 'red' : undefined}
        >
          <LuRefreshCw />
        </Button>
      </Tooltip>
    )
  }

  return (
    <HStack gap={2}>
      <Button size="sm" variant="outline" onClick={handleSync} loading={isSyncing}>
        <LuLink />
        <Text>Найти связи</Text>
      </Button>
      {error && (
        <Text color="red.400" fontSize="sm">
          {error}
        </Text>
      )}
    </HStack>
  )
}
