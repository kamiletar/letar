'use client'

import { formatBytes, formatTimestamp, getContainerStateColor, getContainerStateText } from '@/lib/format'
import { Badge, Box, Button, Card, HStack, Spinner, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { ContainerInspectDialog } from './ContainerInspectDialog'
import { ContainerLogsDialog } from './ContainerLogsDialog'

interface ContainerCardProps {
  id: string
  names: string[]
  image: string
  state: string
  status: string
  created: number
  ports: Array<{
    privatePort: number
    publicPort?: number
    type: string
  }>
  stats?: {
    cpuPercent: string
    memoryUsage: number
    memoryLimit: number
    memoryPercent: string
  } | null
  onStart?: () => void
  onStop?: () => void
  onRestart?: () => void
  onRemove?: () => void
  /** Индикатор переходного состояния (starting/stopping/restarting/removing) */
  isTransitioning?: boolean
}

export function ContainerCard({
  id,
  names,
  image,
  state,
  status,
  created,
  ports,
  stats,
  onStart,
  onStop,
  onRestart,
  onRemove,
  isTransitioning = false,
}: ContainerCardProps) {
  const [logsOpen, setLogsOpen] = useState(false)
  const [inspectOpen, setInspectOpen] = useState(false)
  const isRunning = state === 'running'
  const name = names[0]?.replace('/', '') || 'unknown'

  // Проверка на переходные состояния
  const isStarting = state === 'starting'
  const isStopping = state === 'stopping'
  const isRestarting = state === 'restarting'
  const isRemoving = state === 'removing'
  const inTransition = isTransitioning || isStarting || isStopping || isRestarting || isRemoving

  // Форматирование портов (компактный вид)
  const formatPorts = () => {
    if (!ports || ports.length === 0) {
      return '—'
    }
    return ports.map((p) => (p.publicPort ? `${p.publicPort}:${p.privatePort}` : `${p.privatePort}`)).join(', ')
  }

  return (
    <Card.Root opacity={inTransition ? 0.7 : 1} transition="opacity 0.2s" position="relative" size="sm">
      {/* Индикатор загрузки поверх карточки */}
      {inTransition && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="bg/50"
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="1"
        >
          <Spinner size="md" color="blue.500" />
        </Box>
      )}

      <Card.Body gap="2" py="3">
        {/* Заголовок: имя + badge в одну строку */}
        <HStack justify="space-between" align="center">
          <Text fontSize="md" fontWeight="bold" truncate>
            {name}
          </Text>
          <Badge colorPalette={getContainerStateColor(state)} size="sm" variant="solid">
            <HStack gap="1">
              {inTransition && <Spinner size="xs" />}
              <span>{getContainerStateText(state)}</span>
            </HStack>
          </Badge>
        </HStack>

        {/* Образ */}
        <Text fontSize="xs" color="fg.muted" truncate>
          {image}
        </Text>

        {/* Метрики в одну строку (только для running) */}
        {isRunning && stats && !inTransition && (
          <HStack gap="3" fontSize="xs" color="fg.muted">
            <Text>
              CPU:{' '}
              <Text as="span" fontWeight="medium" color="fg">
                {stats.cpuPercent}%
              </Text>
            </Text>
            <Text>
              Mem:{' '}
              <Text as="span" fontWeight="medium" color="fg">
                {formatBytes(stats.memoryUsage)}
              </Text>
              <Text as="span" color="fg.subtle">
                ({stats.memoryPercent}%)
              </Text>
            </Text>
          </HStack>
        )}

        {/* Порты + Статус + Created в компактном виде */}
        <HStack gap="3" fontSize="xs" color="fg.muted" flexWrap="wrap">
          <Text>
            Ports:{' '}
            <Text as="span" fontWeight="medium" color="fg">
              {formatPorts()}
            </Text>
          </Text>
          <Text truncate>{status}</Text>
          <Text>{formatTimestamp(created)}</Text>
        </HStack>

        {/* Кнопки управления — компактные */}
        <HStack gap="1" flexWrap="wrap">
          {isRunning && !inTransition && (
            <Button size="xs" variant="outline" onClick={() => setLogsOpen(true)}>
              Logs
            </Button>
          )}

          <Button size="xs" variant="outline" onClick={() => setInspectOpen(true)} disabled={inTransition}>
            Inspect
          </Button>

          {!isRunning && !inTransition && onStart && (
            <Button size="xs" colorPalette="green" onClick={onStart}>
              Start
            </Button>
          )}

          {isRunning && !inTransition && onStop && (
            <Button size="xs" colorPalette="red" onClick={onStop}>
              Stop
            </Button>
          )}

          {isRunning && !inTransition && onRestart && (
            <Button size="xs" colorPalette="blue" onClick={onRestart}>
              Restart
            </Button>
          )}

          {!isRunning && !inTransition && onRemove && (
            <Button size="xs" variant="outline" colorPalette="red" onClick={onRemove}>
              Remove
            </Button>
          )}
        </HStack>

        {/* Диалог логов */}
        <ContainerLogsDialog containerId={id} containerName={name} open={logsOpen} onOpenChange={setLogsOpen} />

        {/* Диалог информации */}
        <ContainerInspectDialog
          containerId={id}
          containerName={name}
          open={inspectOpen}
          onOpenChange={setInspectOpen}
        />
      </Card.Body>
    </Card.Root>
  )
}
