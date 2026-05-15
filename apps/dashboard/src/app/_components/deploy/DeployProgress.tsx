'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { AnsiText } from '@/lib/ansi-to-react'
import { formatDuration } from '@/lib/format'
import { useRealtimeDeploy } from '@/lib/hooks/useRealtimeDeploy'
import { Badge, Box, Button, Card, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'

interface DeployProgressProps {
  enabled?: boolean
}

export const DeployProgress = ({ enabled = true }: DeployProgressProps) => {
  const { data, isConnected } = useRealtimeDeploy(enabled)
  const [allLogs, setAllLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const processedLogsRef = useRef<Set<string>>(new Set())
  const [isClearing, setIsClearing] = useState(false)
  const lastStartTimeRef = useRef<string | null>(null)

  // Очищаем логи когда начинается новый деплой (startTime изменился)
  useEffect(() => {
    const currentStartTime = data?.status?.startTime
    if (currentStartTime && currentStartTime !== lastStartTimeRef.current) {
      // Новый деплой начался — очищаем старые логи
      setAllLogs([])
      processedLogsRef.current.clear()
      lastStartTimeRef.current = currentStartTime
    }
  }, [data?.status?.startTime])

  // Накапливаем логи - добавляем только действительно новые
  useEffect(() => {
    if (data?.logs && data.logs.length > 0) {
      const newLogs = data.logs.filter((log) => !processedLogsRef.current.has(log))
      if (newLogs.length > 0) {
        newLogs.forEach((log) => processedLogsRef.current.add(log))
        setAllLogs((prev) => [...prev, ...newLogs])
      }
    }
  }, [data?.logs])

  // Автоскролл вниз
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [allLogs, autoScroll])

  const clearLogs = async () => {
    setIsClearing(true)
    try {
      const res = await fetch('/api/deploy/clear-logs', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to clear logs')
      }
      setAllLogs([])
      processedLogsRef.current.clear()
      toaster.create({
        title: 'Логи очищены',
        type: 'success',
      })
    } catch (error) {
      toaster.create({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось очистить логи',
        type: 'error',
      })
    } finally {
      setIsClearing(false)
    }
  }

  if (!data?.status) {
    return (
      <Card.Root>
        <Card.Body>
          <Text color="fg.muted">Деплой не запущен</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const { status } = data

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={3}>
            <Text fontSize="lg" fontWeight="bold">
              Статус деплоя
            </Text>
            <Badge colorPalette={isConnected ? 'green' : 'yellow'} size="sm">
              {isConnected ? '🟢 Real-time' : '🟡 Polling'}
            </Badge>
            {status.isRunning && (
              <Badge colorPalette="blue" size="sm">
                В процессе
              </Badge>
            )}
          </HStack>
          <HStack>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAutoScroll(!autoScroll)}
              colorPalette={autoScroll ? 'green' : 'gray'}
            >
              {autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearLogs} loading={isClearing}>
              <LuRefreshCw />
              Очистить
            </Button>
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Progress Bar - показывается когда деплой запущен */}
          {status.isRunning && (
            <Box>
              <Progress.Root value={null} size="sm" colorPalette="blue">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}

          {/* Информация о статусе */}
          {status.isRunning && (
            <HStack gap={6} fontSize="sm" color="fg.muted">
              {status.app && (
                <Text>
                  <strong>Приложение:</strong> {status.app}
                </Text>
              )}
              {status.pid && (
                <Text>
                  <strong>PID:</strong> {status.pid}
                </Text>
              )}
              {status.startTime && (
                <Text>
                  <strong>Длительность:</strong> {formatDuration(status.startTime)}
                </Text>
              )}
              {status.dryRun && (
                <Badge colorPalette="yellow" size="sm">
                  Dry Run
                </Badge>
              )}
            </HStack>
          )}

          {/* Контейнер логов */}
          {allLogs.length > 0 && (
            <Box
              bg="bg.subtle"
              p={4}
              rounded="md"
              maxH="400px"
              overflowY="auto"
              fontFamily="mono"
              fontSize="sm"
              border="1px solid"
              borderColor="border.muted"
            >
              <VStack align="stretch" gap={0}>
                {allLogs.map((log, index) => (
                  /* oxlint-disable-next-line eslint-plugin-react/no-array-index-key -- Log lines are append-only */
                  <Box key={index} fontFamily="mono" fontSize="xs" whiteSpace="pre-wrap" wordBreak="break-all">
                    <AnsiText text={log} />
                  </Box>
                ))}
                <div ref={logsEndRef} />
              </VStack>
            </Box>
          )}

          {allLogs.length === 0 && !status.isRunning && (
            <Text color="fg.muted" textAlign="center" py={8}>
              Нет логов деплоя
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
