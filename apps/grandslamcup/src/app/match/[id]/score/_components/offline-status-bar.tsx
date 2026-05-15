'use client'

/**
 * Панель статуса оффлайн-синхронизации.
 *
 * Показывает: online/offline, pending операции, кнопка sync, автосинк.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { getPendingCount, saveMatchSnapshot } from '@/lib/offline/scorer-offline-store'
import { syncMatchOperations } from '@/lib/offline/scorer-sync-queue'
import { Badge, Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { useOnlineStatus } from '@letar/hooks'
import { useCallback, useEffect, useState } from 'react'
import { LuCloud, LuCloudOff, LuRefreshCw } from 'react-icons/lu'

interface OfflineStatusBarProps {
  matchId: string
  scorerToken: string
  /** Данные матча для сохранения в IndexedDB */
  matchData: unknown
}

export function OfflineStatusBar({ matchId, scorerToken, matchData }: OfflineStatusBarProps) {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [preloaded, setPreloaded] = useState(false)

  // Обновляем счётчик pending операций
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount(matchId)
      setPendingCount(count)
    } catch {
      // IndexedDB может быть недоступен
    }
  }, [matchId])

  useEffect(() => {
    refreshPendingCount()
    const interval = setInterval(refreshPendingCount, 5000)
    return () => clearInterval(interval)
  }, [refreshPendingCount])

  // Автоматическая предзагрузка данных при монтировании компонента (один раз)
  useEffect(() => {
    saveMatchSnapshot(matchId, matchData)
      .then(() => setPreloaded(true))
      .catch((_err) => {
        // IndexedDB недоступен (например, приватный режим Safari) — игнорируем
      })
  }, []) // intentionally empty: runs once on mount

  // Автосинхронизация при восстановлении связи
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync()
    }
  }, [isOnline]) // автосинк при восстановлении связи

  /** Ручная синхронизация */
  const handleSync = async () => {
    if (!isOnline || syncing) {
      return
    }
    setSyncing(true)
    try {
      const result = await syncMatchOperations(matchId, scorerToken)
      if (result.error) {
        toaster.error({ title: `Синхронизация: ${result.error}` })
      } else if (result.synced > 0) {
        toaster.success({ title: `Синхронизировано: ${result.synced} операций` })
      }
      await refreshPendingCount()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Box
      bg={isOnline ? 'green.subtle' : 'orange.subtle'}
      borderWidth="1px"
      borderColor={isOnline ? 'green.muted' : 'orange.muted'}
      borderRadius="lg"
      px={3}
      py={2}
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
        {/* Статус подключения */}
        <HStack gap={2}>
          {isOnline ? <LuCloud size={16} /> : <LuCloudOff size={16} />}
          <Text fontSize="sm" fontWeight="medium">
            {isOnline ? 'Онлайн' : 'Оффлайн'}
          </Text>
          {pendingCount > 0 && (
            <Badge colorPalette={pendingCount > 10 ? 'red' : 'yellow'} size="sm">
              {pendingCount} в очереди
            </Badge>
          )}
          {preloaded && (
            <Badge colorPalette="green" size="sm">
              Готов к оффлайн
            </Badge>
          )}
        </HStack>

        {/* Кнопки */}
        <HStack gap={2}>
          {pendingCount > 0 && isOnline && (
            <Button size="xs" colorPalette="green" onClick={handleSync} loading={syncing}>
              <LuRefreshCw size={12} />
              Синхронизировать
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  )
}
