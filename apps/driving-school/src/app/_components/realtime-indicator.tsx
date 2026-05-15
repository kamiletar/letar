/**
 * Индикатор статуса Real-time подключения
 *
 * Отображает:
 * - Статус подключения (точка с цветом)
 * - Время последнего обновления
 * - Возможность переподключения
 *
 * @module realtime-indicator
 */

'use client'

import { formatLastUpdated, REALTIME_STATUS_CONFIG, type RealtimeStatus } from '@/app/_hooks/use-realtime'
import { Box, Button, HStack, Icon, Text, Tooltip } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuRefreshCw, LuWifi, LuWifiOff } from 'react-icons/lu'

// === Типы ===

export interface RealtimeIndicatorProps {
  /** Текущий статус */
  status: RealtimeStatus
  /** Время последнего обновления */
  lastUpdated: Date | null
  /** Callback переподключения */
  onReconnect?: () => void
  /** Показывать время обновления */
  showLastUpdated?: boolean
  /** Компактный режим (только точка) */
  compact?: boolean
  /** Размер */
  size?: 'sm' | 'md'
}

// === Компонент точки статуса ===

interface StatusDotProps {
  status: RealtimeStatus
  size?: 'sm' | 'md'
}

function StatusDot({ status, size = 'md' }: StatusDotProps) {
  const config = REALTIME_STATUS_CONFIG[status]
  const dotSize = size === 'sm' ? 2 : 2.5

  return (
    <Box
      w={dotSize}
      h={dotSize}
      borderRadius="full"
      bg={`${config.color}.500`}
      animation={status === 'connecting' ? 'pulse 1.5s infinite' : undefined}
      css={{
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      }}
    />
  )
}

// === Основной компонент ===

export function RealtimeIndicator({
  status,
  lastUpdated,
  onReconnect,
  showLastUpdated = true,
  compact = false,
  size = 'md',
}: RealtimeIndicatorProps) {
  const [formattedTime, setFormattedTime] = useState(() => formatLastUpdated(lastUpdated))
  const config = REALTIME_STATUS_CONFIG[status]

  // Обновляем время каждые 10 секунд
  useEffect(() => {
    setFormattedTime(formatLastUpdated(lastUpdated))

    const interval = setInterval(() => {
      setFormattedTime(formatLastUpdated(lastUpdated))
    }, 10000)

    return () => clearInterval(interval)
  }, [lastUpdated])

  // Компактный режим — только точка с tooltip
  if (compact) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Box cursor="default">
            <StatusDot status={status} size={size} />
          </Box>
        </Tooltip.Trigger>
        <Tooltip.Content>{`${config.label}${lastUpdated ? ` • ${formattedTime}` : ''}`}</Tooltip.Content>
      </Tooltip.Root>
    )
  }

  const isDisconnected = status === 'disconnected' || status === 'error'
  const IconComponent = isDisconnected ? LuWifiOff : LuWifi
  const fontSize = size === 'sm' ? 'xs' : 'sm'

  return (
    <HStack gap={2} color="fg.muted" fontSize={fontSize}>
      <HStack gap={1.5}>
        <StatusDot status={status} size={size} />
        <Icon as={IconComponent} boxSize={size === 'sm' ? 3 : 4} />
        <Text>{config.label}</Text>
      </HStack>

      {showLastUpdated && lastUpdated && status === 'connected' && (
        <>
          <Text color="fg.subtle">•</Text>
          <Text color="fg.subtle">{formattedTime}</Text>
        </>
      )}

      {isDisconnected && onReconnect && (
        <Button size="xs" variant="ghost" onClick={onReconnect}>
          <Icon as={LuRefreshCw} boxSize={3} />
          Переподключить
        </Button>
      )}
    </HStack>
  )
}

// === Компактная версия для header ===

export function RealtimeStatusBadge({ status, lastUpdated }: Pick<RealtimeIndicatorProps, 'status' | 'lastUpdated'>) {
  const config = REALTIME_STATUS_CONFIG[status]

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <HStack gap={1.5} px={2} py={1} borderRadius="full" bg={`${config.color}.subtle`} cursor="default">
          <StatusDot status={status} size="sm" />
          <Text fontSize="xs" fontWeight="medium" color={`${config.color}.fg`}>
            {status === 'connected' ? 'Live' : config.label}
          </Text>
        </HStack>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {`${config.label}${lastUpdated ? ` • Обновлено ${formatLastUpdated(lastUpdated)}` : ''}`}
      </Tooltip.Content>
    </Tooltip.Root>
  )
}
