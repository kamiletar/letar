/**
 * SyncIndicator — Индикатор синхронизации Watch Party
 *
 * Показывает рассинхрон между локальной позицией и позицией хоста.
 */

'use client'

import { Badge, HStack, Text, useToken } from '@chakra-ui/react'
import { LuCheck, LuMinus, LuPlus, LuRefreshCw } from 'react-icons/lu'

export interface SyncIndicatorProps {
  /** Локальная позиция в секундах */
  localPosition: number
  /** Позиция хоста в секундах */
  hostPosition: number
  /** Порог синхронизации (по умолчанию 0.5 сек) */
  threshold?: number
  /** Идёт синхронизация */
  isSyncing?: boolean
}

export function SyncIndicator({ localPosition, hostPosition, threshold = 0.5, isSyncing = false }: SyncIndicatorProps) {
  const diff = localPosition - hostPosition

  const [green500, red500, yellow500] = useToken('colors', ['green.500', 'red.500', 'yellow.500'])

  // Определяем статус синхронизации
  const isSynced = Math.abs(diff) <= threshold
  const isAhead = diff > threshold

  // Форматируем разницу
  const formatDiff = (seconds: number): string => {
    const abs = Math.abs(seconds)
    if (abs < 1) {
      return `${(abs * 1000).toFixed(0)}ms`
    }
    return `${abs.toFixed(1)}s`
  }

  if (isSyncing) {
    return (
      <Badge colorPalette="blue" variant="subtle" size="sm">
        <HStack gap={1}>
          <LuRefreshCw className="animate-spin" style={{ width: 12, height: 12 }} />
          <Text>Синхронизация...</Text>
        </HStack>
      </Badge>
    )
  }

  if (isSynced) {
    return (
      <Badge colorPalette="green" variant="subtle" size="sm">
        <HStack gap={1}>
          <LuCheck style={{ width: 12, height: 12, color: green500 }} />
          <Text>Синхронизировано</Text>
        </HStack>
      </Badge>
    )
  }

  if (isAhead) {
    return (
      <Badge colorPalette="yellow" variant="subtle" size="sm">
        <HStack gap={1}>
          <LuPlus style={{ width: 12, height: 12, color: yellow500 }} />
          <Text>+{formatDiff(diff)}</Text>
        </HStack>
      </Badge>
    )
  }

  // isBehind
  return (
    <Badge colorPalette="red" variant="subtle" size="sm">
      <HStack gap={1}>
        <LuMinus style={{ width: 12, height: 12, color: red500 }} />
        <Text>-{formatDiff(Math.abs(diff))}</Text>
      </HStack>
    </Badge>
  )
}
