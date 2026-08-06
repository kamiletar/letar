/**
 * PullToRefresh — визуальный индикатор pull-to-refresh
 *
 * Показывает spinner и текст состояния во время pull и обновления.
 */

import { Box, Spinner, Text } from '@chakra-ui/react'
import { LuArrowDown } from 'react-icons/lu'

import type { PullToRefreshState } from '../hooks/usePullToRefresh'

interface PullToRefreshProps {
  /** Текущее состояние */
  state: PullToRefreshState
  /** Расстояние pull в пикселях */
  pullDistance: number
  /** Прогресс до активации (0-1) */
  progress: number
  /** Показывать ли индикатор */
  show: boolean
}

/** Текст для каждого состояния */
const STATE_TEXT: Record<PullToRefreshState, string> = {
  idle: '',
  pulling: 'Потяните для обновления',
  ready: 'Отпустите для обновления',
  refreshing: 'Обновление...',
}

export function PullToRefresh({ state, pullDistance, progress, show }: PullToRefreshProps) {
  if (!show && state === 'idle') {
    return null
  }

  const isRefreshing = state === 'refreshing'
  const isReady = state === 'ready'

  // Opacity зависит от прогресса
  const opacity = Math.min(progress * 1.5, 1)

  // Rotation иконки
  const rotation = isReady ? 180 : progress * 180

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-end"
      h={`${pullDistance}px`}
      overflow="hidden"
      pointerEvents="none"
      zIndex={100}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={1}
        pb={3}
        opacity={opacity}
        transition={state === 'idle' ? 'opacity 0.3s ease-out' : undefined}
      >
        {/* Иконка */}
        <Box
          w="36px"
          h="36px"
          borderRadius="full"
          bg="purple.600/20"
          display="flex"
          alignItems="center"
          justifyContent="center"
          transition={state === 'idle' ? 'transform 0.3s ease-out' : 'transform 0.15s ease-out'}
          transform={`rotate(${rotation}deg)`}
        >
          {isRefreshing
            ? <Spinner size="sm" color="purple.400" />
            : <LuArrowDown size={18} color="var(--chakra-colors-purple-400)" />}
        </Box>

        {/* Текст */}
        <Text fontSize="xs" color="gray.400" textAlign="center">
          {STATE_TEXT[state]}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Контейнер с pull-to-refresh функциональностью
 *
 * Оборачивает контент и добавляет pull-to-refresh поведение.
 */
interface PullToRefreshContainerProps {
  children: React.ReactNode
  /** Показывать ли индикатор */
  show: boolean
  /** Состояние pull */
  state: PullToRefreshState
  /** Расстояние pull */
  pullDistance: number
  /** Прогресс */
  progress: number
  /** CSS стиль контента */
  contentStyle: React.CSSProperties
  /** Touch handlers */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
  }
}

export function PullToRefreshContainer({
  children,
  show,
  state,
  pullDistance,
  progress,
  contentStyle,
  handlers,
}: PullToRefreshContainerProps) {
  return (
    <Box position="relative" minH="100vh" {...handlers}>
      {/* Индикатор */}
      <PullToRefresh state={state} pullDistance={pullDistance} progress={progress} show={show} />

      {/* Контент */}
      <Box style={contentStyle}>{children}</Box>
    </Box>
  )
}
