'use client'

/**
 * Секция статуса IPFS ноды с трекингом скорости и диагностикой
 */

import {
  Badge,
  Box,
  Button,
  Collapsible,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArrowDown,
  LuArrowUp,
  LuChevronDown,
  LuChevronUp,
  LuCopy,
  LuDatabase,
  LuGlobe,
  LuInfo,
  LuPause,
  LuPlay,
  LuShield,
  LuTrash2,
  LuUsers,
} from 'react-icons/lu'

import type { P2PDiagnostics } from '../../../../../../shared/types/ipfs'
import type { useP2PSharing } from '../use-p2p-sharing'
import { formatBytes, formatSpeed, getNatStatusColor, getNatStatusLabel, getPeerColor } from './format-utils'

interface IpfsStatusSectionProps {
  ipfs: ReturnType<typeof useP2PSharing>['ipfs']
  onStart: () => Promise<void>
  onStop: () => Promise<void>
}

export function IpfsStatusSection({ ipfs, onStart, onStop }: IpfsStatusSectionProps) {
  const isRunning = ipfs.status?.isRunning ?? false

  // Трекинг скорости трафика
  const prevBytesRef = useRef<{ bytesIn: number; bytesOut: number; timestamp: number } | null>(null)
  const [speeds, setSpeeds] = useState({ inSpeed: 0, outSpeed: 0 })

  // Garbage Collection
  const [isRunningGc, setIsRunningGc] = useState(false)
  const [gcResult, setGcResult] = useState<{ blocksRemoved: number; savedBytes: number } | null>(null)

  // Диагностика P2P
  const [diagnostics, setDiagnostics] = useState<P2PDiagnostics | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false)

  useEffect(() => {
    if (!ipfs.status?.isRunning) {
      prevBytesRef.current = null
      setSpeeds({ inSpeed: 0, outSpeed: 0 })
      setDiagnostics(null)
      return
    }

    const now = Date.now()
    const prev = prevBytesRef.current

    if (prev && ipfs.status) {
      const timeDiff = (now - prev.timestamp) / 1000 // секунды
      if (timeDiff > 0) {
        const inSpeed = Math.max(0, (ipfs.status.bytesIn - prev.bytesIn) / timeDiff)
        const outSpeed = Math.max(0, (ipfs.status.bytesOut - prev.bytesOut) / timeDiff)
        setSpeeds({ inSpeed, outSpeed })
      }
    }

    if (ipfs.status) {
      prevBytesRef.current = {
        bytesIn: ipfs.status.bytesIn,
        bytesOut: ipfs.status.bytesOut,
        timestamp: now,
      }
    }
  }, [ipfs.status])

  // Загрузить диагностику
  const loadDiagnostics = useCallback(async () => {
    if (!isRunning) {
      return
    }

    setIsLoadingDiagnostics(true)
    try {
      const result = await window.electronAPI?.ipfs.diagnostics()
      if (result?.success && result.data) {
        setDiagnostics(result.data)
      }
    } catch {
      // Игнорируем ошибки
    } finally {
      setIsLoadingDiagnostics(false)
    }
  }, [isRunning])

  // Запуск Garbage Collection
  const runGc = useCallback(async () => {
    if (!isRunning) {
      return
    }

    setIsRunningGc(true)
    setGcResult(null)

    const sizeBefore = ipfs.status?.blockstoreSize ?? 0

    try {
      const result = await window.electronAPI?.ipfs.repoGc()
      if (result?.success && result.data) {
        // Запрашиваем обновлённый статус для размера после GC
        const statusResult = await window.electronAPI?.ipfs.status()
        const sizeAfter = statusResult?.data?.blockstoreSize ?? sizeBefore
        setGcResult({
          blocksRemoved: result.data.blocksRemoved,
          savedBytes: Math.max(0, sizeBefore - sizeAfter),
        })
      }
    } catch {
      // Игнорируем ошибки
    } finally {
      setIsRunningGc(false)
    }
  }, [isRunning, ipfs.status?.blockstoreSize])

  // Автообновление диагностики когда панель открыта
  useEffect(() => {
    if (!showDiagnostics || !isRunning) {
      return
    }

    loadDiagnostics()
    const interval = setInterval(loadDiagnostics, 5000)
    return () => clearInterval(interval)
  }, [showDiagnostics, isRunning, loadDiagnostics])

  const peerCount = ipfs.status?.connectedPeers ?? 0
  const peerColor = getPeerColor(peerCount)

  return (
    <Box>
      <HStack mb={4} gap={3}>
        <Icon as={LuGlobe} color="purple.400" boxSize={5} />
        <Heading size="sm">IPFS Нода</Heading>
        <Badge colorPalette={isRunning ? 'green' : 'gray'} size="sm">
          {isRunning ? 'Запущена' : 'Остановлена'}
        </Badge>
      </HStack>

      {ipfs.isLoading
        ? <Text color="fg.subtle">Загрузка...</Text>
        : ipfs.error
        ? <Text color="red.400">{ipfs.error}</Text>
        : (
          <VStack align="stretch" gap={3}>
            {/* Статистика — верхняя строка (пиры, NAT, хранилище) */}
            {isRunning && ipfs.status && (
              <>
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                  {/* Пиры */}
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <Icon as={LuUsers} color={`${peerColor}.400`} boxSize={3.5} />
                      <Text fontSize="xs" color="fg.subtle">
                        Пиры
                      </Text>
                    </HStack>
                    <HStack gap={2} align="baseline">
                      <Text fontWeight="bold" fontSize="xl" color={`${peerColor}.400`}>
                        {peerCount}
                      </Text>
                      {peerCount === 0 && (
                        <Text fontSize="xs" color="red.400">
                          нет
                        </Text>
                      )}
                    </HStack>
                  </Box>

                  {/* NAT статус */}
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <Icon as={LuShield} color={`${getNatStatusColor(ipfs.status.natStatus)}.400`} boxSize={3.5} />
                      <Text fontSize="xs" color="fg.subtle">
                        NAT
                      </Text>
                    </HStack>
                    <Text fontWeight="bold" fontSize="lg" color={`${getNatStatusColor(ipfs.status.natStatus)}.400`}>
                      {getNatStatusLabel(ipfs.status.natStatus)}
                    </Text>
                  </Box>

                  {/* Blockstore */}
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <Icon as={LuDatabase} color="blue.400" boxSize={3.5} />
                      <Text fontSize="xs" color="fg.subtle">
                        Хранилище
                      </Text>
                    </HStack>
                    <Text fontWeight="bold" fontSize="lg">
                      {formatBytes(ipfs.status.blockstoreSize)}
                    </Text>
                  </Box>
                </Grid>

                {/* Трафик — нижняя строка */}
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  {/* Входящий */}
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <Icon as={LuArrowDown} color="green.400" boxSize={3.5} />
                      <Text fontSize="xs" color="fg.subtle">
                        Входящий
                      </Text>
                    </HStack>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="semibold" fontSize="sm">
                        {formatBytes(ipfs.status.bytesIn)}
                      </Text>
                      <Text fontSize="xs" color="green.400">
                        {formatSpeed(speeds.inSpeed)}
                      </Text>
                    </VStack>
                  </Box>

                  {/* Исходящий */}
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <Icon as={LuArrowUp} color="orange.400" boxSize={3.5} />
                      <Text fontSize="xs" color="fg.subtle">
                        Исходящий
                      </Text>
                    </HStack>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="semibold" fontSize="sm">
                        {formatBytes(ipfs.status.bytesOut)}
                      </Text>
                      <Text fontSize="xs" color="orange.400">
                        {formatSpeed(speeds.outSpeed)}
                      </Text>
                    </VStack>
                  </Box>
                </Grid>

                {/* Диагностика P2P — Collapsible */}
                <Collapsible.Root open={showDiagnostics} onOpenChange={(e) => setShowDiagnostics(e.open)}>
                  <Collapsible.Trigger asChild>
                    <Button size="xs" variant="ghost" w="full">
                      <Icon as={LuInfo} mr={2} />
                      Диагностика P2P
                      <Icon as={showDiagnostics ? LuChevronUp : LuChevronDown} ml="auto" />
                    </Button>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <Box mt={2} p={3} bg="bg.subtle" borderRadius="md">
                      {isLoadingDiagnostics && !diagnostics
                        ? (
                          <Text fontSize="xs" color="fg.subtle">
                            Загрузка...
                          </Text>
                        )
                        : diagnostics
                        ? (
                          <VStack align="stretch" gap={2}>
                            {/* Направление соединений */}
                            <HStack justify="space-between">
                              <Text fontSize="xs" color="fg.subtle">
                                Входящие / Исходящие:
                              </Text>
                              <Text fontSize="xs" fontWeight="medium">
                                <Text as="span" color="green.400">
                                  {diagnostics.inbound}
                                </Text>
                                {' / '}
                                <Text as="span" color="blue.400">
                                  {diagnostics.outbound}
                                </Text>
                              </Text>
                            </HStack>

                            {/* Транспорты */}
                            <Box>
                              <Text fontSize="xs" color="fg.subtle" mb={1}>
                                Транспорты:
                              </Text>
                              <HStack gap={3} flexWrap="wrap">
                                {diagnostics.byTransport.tcp > 0 && (
                                  <Badge size="sm" colorPalette="blue">
                                    TCP: {diagnostics.byTransport.tcp}
                                  </Badge>
                                )}
                                {diagnostics.byTransport.quic > 0 && (
                                  <Badge size="sm" colorPalette="purple">
                                    QUIC: {diagnostics.byTransport.quic}
                                  </Badge>
                                )}
                                {diagnostics.byTransport.relay > 0 && (
                                  <Badge size="sm" colorPalette="orange">
                                    Relay: {diagnostics.byTransport.relay}
                                  </Badge>
                                )}
                                {diagnostics.byTransport.ws > 0 && (
                                  <Badge size="sm" colorPalette="green">
                                    WS: {diagnostics.byTransport.ws}
                                  </Badge>
                                )}
                                {Object.values(diagnostics.byTransport).every((v) => v === 0) && (
                                  <Text fontSize="xs" color="fg.muted">
                                    нет соединений
                                  </Text>
                                )}
                              </HStack>
                            </Box>

                            {/* Listen адреса */}
                            {diagnostics.listenAddrs.length > 0 && (
                              <Box>
                                <Text fontSize="xs" color="fg.subtle" mb={1}>
                                  Listen адреса ({diagnostics.listenAddrs.length}):
                                </Text>
                                <VStack align="stretch" gap={0.5}>
                                  {diagnostics.listenAddrs.slice(0, 3).map((addr, i) => (
                                    <Text key={i} fontSize="2xs" fontFamily="mono" color="fg.muted" truncate>
                                      {addr}
                                    </Text>
                                  ))}
                                  {diagnostics.listenAddrs.length > 3 && (
                                    <Text fontSize="2xs" color="fg.subtle">
                                      ...и ещё {diagnostics.listenAddrs.length - 3}
                                    </Text>
                                  )}
                                </VStack>
                              </Box>
                            )}

                            {/* Observed адреса (публичные) */}
                            {diagnostics.observedAddrs.length > 0 && (
                              <Box>
                                <Text fontSize="xs" color="green.400" mb={1}>
                                  Публичные адреса ({diagnostics.observedAddrs.length}):
                                </Text>
                                <VStack align="stretch" gap={0.5}>
                                  {diagnostics.observedAddrs.slice(0, 2).map((addr, i) => (
                                    <Text key={i} fontSize="2xs" fontFamily="mono" color="green.300" truncate>
                                      {addr}
                                    </Text>
                                  ))}
                                </VStack>
                              </Box>
                            )}
                          </VStack>
                        )
                        : (
                          <Text fontSize="xs" color="fg.subtle">
                            Нет данных
                          </Text>
                        )}
                    </Box>
                  </Collapsible.Content>
                </Collapsible.Root>
              </>
            )}

            {/* PeerId */}
            {isRunning && ipfs.status?.peerId && (
              <Box p={3} bg="bg.subtle" borderRadius="md">
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="fg.subtle">
                    PeerId (ваш IPNS адрес)
                  </Text>
                  <IconButton
                    size="2xs"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(ipfs.status!.peerId!)
                    }}
                    aria-label="Копировать PeerId"
                  >
                    <Icon as={LuCopy} />
                  </IconButton>
                </HStack>
                <Text fontFamily="mono" fontSize="xs" color="fg.muted" wordBreak="break-all">
                  {ipfs.status.peerId}
                </Text>
              </Box>
            )}

            {/* Кнопки управления */}
            <HStack>
              {isRunning
                ? (
                  <>
                    <Button size="sm" variant="outline" colorPalette="red" onClick={onStop} loading={ipfs.isLoading}>
                      <Icon as={LuPause} mr={2} />
                      Остановить
                    </Button>
                    <Button size="sm" variant="outline" onClick={runGc} loading={isRunningGc}>
                      <Icon as={LuTrash2} mr={2} />
                      Очистить хранилище
                    </Button>
                  </>
                )
                : (
                  <Button size="sm" colorPalette="purple" onClick={onStart} loading={ipfs.isLoading}>
                    <Icon as={LuPlay} mr={2} />
                    Запустить
                  </Button>
                )}
            </HStack>

            {/* Результат GC */}
            {gcResult && (
              <Box p={3} bg="green.950" borderRadius="md" borderWidth="1px" borderColor="green.800">
                <Text fontSize="sm" color="green.300">
                  Очистка завершена: удалено {gcResult.blocksRemoved} блоков, освобождено{' '}
                  {formatBytes(gcResult.savedBytes)}
                </Text>
              </Box>
            )}
          </VStack>
        )}
    </Box>
  )
}
