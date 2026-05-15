'use client'

/**
 * Секция синхронизации Kubo pin-серверов из API трекера
 *
 * Показывает список peers, источник (API/cache/hardcoded), время последнего
 * sync и reconnect cycle. Кнопки «Force sync now» и «Force reconnect».
 */

import { Badge, Box, Button, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuCircleCheck, LuRefreshCw, LuServer, LuWaypoints } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

/** Статус из IPC */
interface PeerSyncStatus {
  peers: Array<{
    id: string
    name: string
    role: 'pinner' | 'relay' | 'gateway'
    peerId: string
    multiaddrs: string[]
    peeringRole: 'bootstrap' | 'peering' | 'both'
  }>
  lastSyncAt: number | null
  lastReconnectAt: number | null
  source: 'api' | 'cache' | 'hardcoded'
  lastError: string | null
}

/** Relative time formatter */
function formatRelative(ts: number | null): string {
  if (!ts) {
    return 'никогда'
  }
  const delta = Date.now() - ts
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) {
    return 'только что'
  }
  if (minutes < 60) {
    return `${minutes} мин назад`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ч назад`
  }
  return `${Math.floor(hours / 24)} дн назад`
}

/** Badge для роли сервера */
function RoleBadge({ role }: { role: 'pinner' | 'relay' | 'gateway' }) {
  const colorMap = {
    pinner: 'green',
    relay: 'blue',
    gateway: 'purple',
  } as const
  const labelMap = {
    pinner: 'Pinner',
    relay: 'Relay',
    gateway: 'Gateway',
  } as const
  return (
    <Badge colorPalette={colorMap[role]} size="sm">
      {labelMap[role]}
    </Badge>
  )
}

/** Badge для источника данных */
function SourceBadge({ source }: { source: 'api' | 'cache' | 'hardcoded' }) {
  const colorMap = {
    api: 'green',
    cache: 'yellow',
    hardcoded: 'red',
  } as const
  const labelMap = {
    api: 'API',
    cache: 'Cache',
    hardcoded: 'Hardcoded',
  } as const
  return <Badge colorPalette={colorMap[source]}>{labelMap[source]}</Badge>
}

export function PeerSyncSection() {
  const [status, setStatus] = useState<PeerSyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const loadStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await window.electronAPI?.ipfs?.getSyncedPeers?.()
      if (response?.success && response.data) {
        setStatus(response.data)
      }
    } catch (error) {
      console.warn('[PeerSync] load failed', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    // Обновляем статус каждые 30 сек
    const interval = setInterval(() => void loadStatus(), 30_000)
    return () => clearInterval(interval)
  }, [loadStatus])

  const handleForceSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const response = await window.electronAPI?.ipfs?.forceSyncPeers?.()
      if (response?.success && response.data) {
        const { peersCount, addedCount, removedCount, source } = response.data
        toaster.success({
          title: 'Sync выполнен',
          description: `Источник: ${source}. Peers: ${peersCount} (+${addedCount} / -${removedCount})`,
        })
        await loadStatus()
      } else {
        toaster.error({
          title: 'Ошибка sync',
          description: response?.data?.error ?? response?.error ?? 'Неизвестная ошибка',
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка sync',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsSyncing(false)
    }
  }, [loadStatus])

  const handleForceReconnect = useCallback(async () => {
    setIsReconnecting(true)
    try {
      const response = await window.electronAPI?.ipfs?.forceReconnect?.()
      if (response?.success) {
        toaster.success({
          title: 'Reconnect cycle выполнен',
          description: 'Все peers переподключены',
        })
        await loadStatus()
      } else {
        toaster.error({
          title: 'Ошибка reconnect',
          description: response?.error ?? 'Неизвестная ошибка',
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка reconnect',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsReconnecting(false)
    }
  }, [loadStatus])

  return (
    <Box>
      <HStack mb={4} gap={3} justify="space-between">
        <HStack gap={3}>
          <Icon as={LuWaypoints} color="teal.400" boxSize={5} />
          <Heading size="sm">Синхронизация pin-серверов</Heading>
          {status && <SourceBadge source={status.source} />}
        </HStack>
        <HStack gap={2}>
          <Button
            size="xs"
            variant="outline"
            onClick={() => void handleForceSync()}
            loading={isSyncing}
            loadingText="Sync..."
          >
            <Icon as={LuRefreshCw} mr={1} />
            Force sync
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => void handleForceReconnect()}
            loading={isReconnecting}
            loadingText="Reconnect..."
          >
            <Icon as={LuCircleCheck} mr={1} />
            Reconnect
          </Button>
        </HStack>
      </HStack>

      <Text fontSize="xs" color="fg.muted" mb={4}>
        Актуальный список pin-серверов подтягивается из API трекера и применяется к Kubo. Каждые 30 мин выполняется
        reconnect cycle для разблокировки застарелых bitswap-сессий.
      </Text>

      {/* Статистика */}
      {status && (
        <HStack mb={4} gap={6} fontSize="xs" color="fg.muted">
          <HStack gap={1}>
            <Text>Peers:</Text>
            <Text fontWeight="bold" color="fg">
              {status.peers.length}
            </Text>
          </HStack>
          <HStack gap={1}>
            <Text>Last sync:</Text>
            <Text color="fg">{formatRelative(status.lastSyncAt)}</Text>
          </HStack>
          <HStack gap={1}>
            <Text>Last reconnect:</Text>
            <Text color="fg">{formatRelative(status.lastReconnectAt)}</Text>
          </HStack>
        </HStack>
      )}

      {/* Ошибка */}
      {status?.lastError && (
        <Box p={2} mb={3} bg="red.subtle" borderRadius="md">
          <Text fontSize="xs" color="fg.error">
            API error: {status.lastError}
          </Text>
        </Box>
      )}

      {/* Список peers */}
      {isLoading && !status
        ? (
          <Text fontSize="sm" color="fg.muted">
            Загрузка...
          </Text>
        )
        : status && status.peers.length > 0
        ? (
          <VStack align="stretch" gap={2}>
            {status.peers.map((peer) => (
              <Box
                key={peer.id}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                bg="bg.subtle"
              >
                <HStack justify="space-between" mb={1}>
                  <HStack gap={2}>
                    <Icon as={LuServer} boxSize={4} color="fg.muted" />
                    <Text fontWeight="semibold" fontSize="sm">
                      {peer.name}
                    </Text>
                    <RoleBadge role={peer.role} />
                    <Badge size="sm" variant="subtle">
                      {peer.peeringRole}
                    </Badge>
                  </HStack>
                  <Text fontSize="2xs" fontFamily="mono" color="fg.subtle">
                    ...{peer.peerId.slice(-12)}
                  </Text>
                </HStack>
                <VStack align="start" gap={0.5} mt={1}>
                  {peer.multiaddrs.map((addr) => (
                    <Text key={addr} fontSize="2xs" fontFamily="mono" color="fg.muted" lineClamp={1}>
                      {addr}
                    </Text>
                  ))}
                </VStack>
              </Box>
            ))}
          </VStack>
        )
        : (
          <Text fontSize="sm" color="fg.muted">
            Нет данных
          </Text>
        )}
    </Box>
  )
}
