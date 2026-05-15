'use client'

/**
 * Селектор статуса просмотра аниме
 * Показывает 6 статусов с иконками и цветами
 * При выборе COMPLETED показывает слайдер оценки
 */

import { Box, HStack, Icon, Slider, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuCalendar, LuCheck, LuClock, LuPause, LuPlay, LuX } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'

/** Конфигурация статусов */
export const WATCH_STATUS_CONFIG: Record<
  WatchStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  NOT_STARTED: {
    label: 'Не начато',
    icon: LuPlay,
    color: 'fg.subtle',
    bgColor: 'bg.muted',
  },
  WATCHING: {
    label: 'Смотрю',
    icon: LuClock,
    color: 'blue.fg',
    bgColor: 'blue.subtle',
  },
  COMPLETED: {
    label: 'Просмотрено',
    icon: LuCheck,
    color: 'green.fg',
    bgColor: 'green.subtle',
  },
  ON_HOLD: {
    label: 'Отложено',
    icon: LuPause,
    color: 'yellow.fg',
    bgColor: 'yellow.subtle',
  },
  DROPPED: {
    label: 'Брошено',
    icon: LuX,
    color: 'red.fg',
    bgColor: 'red.subtle',
  },
  PLANNED: {
    label: 'Запланировано',
    icon: LuCalendar,
    color: 'purple.fg',
    bgColor: 'purple.subtle',
  },
}

/** Порядок отображения статусов */
export const STATUS_ORDER: WatchStatus[] = ['NOT_STARTED', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLANNED']

interface WatchStatusSelectorProps {
  /** Текущий статус */
  value: WatchStatus
  /** Обработчик изменения статуса */
  onChange: (status: WatchStatus) => void
  /** Текущая оценка (0-10) */
  rating?: number | null
  /** Обработчик изменения оценки */
  onRatingChange?: (rating: number) => void
  /** Показывать ли оценку */
  showRating?: boolean
  /** Размер кнопок */
  size?: 'sm' | 'md'
}

/**
 * Селектор статуса просмотра
 */
export function WatchStatusSelector({
  value,
  onChange,
  rating,
  onRatingChange,
  showRating = true,
  size = 'md',
}: WatchStatusSelectorProps) {
  const [localRating, setLocalRating] = useState(rating ?? 0)

  const handleRatingChange = useCallback(
    (details: { value: number[] }) => {
      const newRating = details.value[0]
      setLocalRating(newRating)
      onRatingChange?.(newRating)
    },
    [onRatingChange]
  )

  const buttonSize = size === 'sm' ? { px: 2, py: 1 } : { px: 3, py: 2 }
  const iconSize = size === 'sm' ? 4 : 5
  const fontSize = size === 'sm' ? 'xs' : 'sm'

  return (
    <VStack gap={3} align="stretch">
      {/* Кнопки статусов */}
      <HStack gap={1} flexWrap="wrap">
        {STATUS_ORDER.map((status) => {
          const config = WATCH_STATUS_CONFIG[status]
          const isActive = value === status

          return (
            <Box
              key={status}
              display="flex"
              alignItems="center"
              gap={1}
              {...buttonSize}
              borderRadius="md"
              cursor="pointer"
              bg={isActive ? config.bgColor : 'transparent'}
              color={isActive ? config.color : 'fg.muted'}
              border="1px"
              borderColor={isActive ? config.color : 'transparent'}
              _hover={{
                bg: isActive ? config.bgColor : 'state.hover',
                color: config.color,
              }}
              transition="all 0.15s ease-out"
              onClick={() => onChange(status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange(status)
                }
              }}
            >
              <Icon as={config.icon} boxSize={iconSize} />
              <Text fontSize={fontSize} fontWeight="medium">
                {config.label}
              </Text>
            </Box>
          )
        })}
      </HStack>

      {/* Слайдер оценки (только для COMPLETED) */}
      {showRating && value === 'COMPLETED' && onRatingChange && (
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="sm" color="fg.muted">
              Оценка
            </Text>
            <Text fontSize="sm" fontWeight="medium">
              {localRating > 0 ? localRating : '—'}
            </Text>
          </HStack>
          <Slider.Root value={[localRating]} onValueChange={handleRatingChange} min={0} max={10} step={1}>
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color="fg.subtle">
              0
            </Text>
            <Text fontSize="xs" color="fg.subtle">
              10
            </Text>
          </HStack>
        </Box>
      )}
    </VStack>
  )
}

/**
 * Бейдж статуса просмотра (компактный)
 */
export function WatchStatusBadge({ status, size = 'sm' }: { status: WatchStatus; size?: 'xs' | 'sm' }) {
  const config = WATCH_STATUS_CONFIG[status]

  // Не показываем бейдж для NOT_STARTED
  if (status === 'NOT_STARTED') {
    return null
  }

  const iconSize = size === 'xs' ? 3 : 4
  const padding = size === 'xs' ? 1 : 1.5

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={padding}
      borderRadius="full"
      bg={config.bgColor}
      color={config.color}
      title={config.label}
    >
      <Icon as={config.icon} boxSize={iconSize} />
    </Box>
  )
}
