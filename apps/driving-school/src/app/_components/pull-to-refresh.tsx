'use client'

import { Box, Spinner, Text } from '@chakra-ui/react'
import { LuArrowDown, LuCheck } from 'react-icons/lu'

interface PullToRefreshIndicatorProps {
  /**
   * Текущее расстояние pull в пикселях
   */
  pullDistance: number
  /**
   * Идёт ли сейчас refresh
   */
  isRefreshing: boolean
  /**
   * Достигнут ли порог для refresh
   */
  canRefresh: boolean
  /**
   * Порог активации (для расчёта прогресса)
   */
  threshold?: number
}

/**
 * Индикатор pull-to-refresh.
 * Показывает стрелку, которая поворачивается при pull,
 * затем спиннер во время загрузки.
 */
export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  canRefresh,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  // Не показываем, если не тянем и не обновляем
  if (pullDistance === 0 && !isRefreshing) {
    return null
  }

  // Прогресс от 0 до 1
  const progress = Math.min(pullDistance / threshold, 1)

  // Поворот стрелки: 0° → 180° при достижении threshold
  const rotation = progress * 180

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      display="flex"
      justifyContent="center"
      alignItems="center"
      height={`${pullDistance}px`}
      bg="bg.panel"
      borderBottomWidth={pullDistance > 10 ? 1 : 0}
      transition={isRefreshing ? 'none' : 'height 0.2s ease-out'}
      overflow="hidden"
      zIndex="sticky"
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={2}
        opacity={Math.min(progress * 2, 1)} // Появляется быстрее
        transform={`scale(${0.8 + progress * 0.2})`}
        transition="transform 0.1s ease-out"
      >
        {isRefreshing ? (
          <>
            <Spinner size="sm" color="fg" />
            <Text fontSize="xs" color="fg.muted">
              Обновление...
            </Text>
          </>
        ) : canRefresh ? (
          <>
            <Box color="fg" transform="rotate(180deg)">
              <LuCheck size={20} />
            </Box>
            <Text fontSize="xs" color="fg.muted">
              Отпустите для обновления
            </Text>
          </>
        ) : (
          <>
            <Box color="fg.muted" transform={`rotate(${rotation}deg)`} transition="transform 0.1s ease-out">
              <LuArrowDown size={20} />
            </Box>
            <Text fontSize="xs" color="fg.muted">
              Потяните для обновления
            </Text>
          </>
        )}
      </Box>
    </Box>
  )
}
