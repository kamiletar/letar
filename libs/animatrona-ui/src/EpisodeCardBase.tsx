'use client'

/**
 * Базовая карточка эпизода с thumbnail и прогрессом
 *
 * Общая структура для tracker, web и desktop:
 * - Thumbnail 16:9
 * - Оверлей с номером и длительностью
 * - Полоска прогресса просмотра
 * - Название
 * - Слоты для кастомных оверлеев и действий
 */

import { Box, Card, HStack, Icon, Text } from '@chakra-ui/react'
import { formatDurationMinutes } from '@letar/animatrona-utils'
import type { ReactNode } from 'react'
import { LuPlay } from 'react-icons/lu'

export interface EpisodeCardBaseProps {
  /** Номер эпизода */
  number: number
  /** Название эпизода */
  name?: string | null
  /** Длительность в секундах */
  duration?: number | null
  /** Процент просмотра (0-100) */
  watchProgress?: number
  /** Завершён ли просмотр */
  isCompleted?: boolean
  /** Слот для thumbnail (img или Image компонент) */
  thumbnailSlot?: ReactNode
  /** Слот для оверлея поверх thumbnail (замок, скриншоты) */
  overlaySlot?: ReactNode
  /** Слот для дополнительного контента под карточкой */
  actionsSlot?: ReactNode
  /** Callback клика по карточке */
  onClick?: () => void
  /** Обёртка карточки (Link, div) — рендерится как children wrapper */
  wrapper?: (children: ReactNode) => ReactNode
  /** Прозрачность карточки (для заблокированных эпизодов) */
  opacity?: number
  /** Цвет бордера при ховере */
  hoverBorderColor?: string
  /** Цвет бордера для completed */
  completedBorderColor?: string
}

/** Базовая карточка эпизода */
export function EpisodeCardBase({
  number,
  name,
  duration,
  watchProgress = 0,
  isCompleted = false,
  thumbnailSlot,
  overlaySlot,
  actionsSlot,
  onClick,
  wrapper,
  opacity = 1,
  hoverBorderColor = 'purple.500',
  completedBorderColor = 'green.500/30',
}: EpisodeCardBaseProps) {
  const content = (
    <Card.Root
      bg="bg.panel"
      border="1px"
      borderColor={isCompleted ? completedBorderColor : 'border.subtle'}
      overflow="hidden"
      cursor="pointer"
      transition="all 0.15s ease-out"
      opacity={opacity}
      _hover={{ borderColor: hoverBorderColor, shadow: 'xl' }}
      _active={{ transform: 'scale(0.98)', shadow: 'md' }}
      onClick={onClick}
    >
      {/* Превью (16:9) с оверлеем */}
      <Box
        position="relative"
        aspectRatio={16 / 9}
        bg="bg.subtle"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        {thumbnailSlot ?? <Icon as={LuPlay} boxSize={8} color="fg.subtle" />}

        {/* Кастомный оверлей */}
        {overlaySlot}

        {/* Оверлей с номером и длительностью */}
        <Box position="absolute" bottom={0} left={0} right={0} bg="blackAlpha.800" py={1} px={2}>
          <HStack justify="space-between">
            <Text fontSize="xs" fontWeight="bold" color="white">
              Эпизод {number}
            </Text>
            {duration != null && duration > 0 && (
              <Text fontSize="xs" color="fg.muted">
                {formatDurationMinutes(duration)}
              </Text>
            )}
          </HStack>
        </Box>

        {/* Прогресс просмотра — полоска внизу превью */}
        {watchProgress > 0 && (
          <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="blackAlpha.700">
            <Box
              h="full"
              bg={isCompleted ? 'green.500' : 'purple.500'}
              w={`${watchProgress}%`}
              transition="width 0.3s"
            />
          </Box>
        )}
      </Box>

      {/* Название */}
      {name && (
        <Card.Body py={2} px={3}>
          <Text fontSize="sm" lineClamp={1} color="fg.muted">
            {name}
          </Text>
        </Card.Body>
      )}

      {/* Дополнительные действия */}
      {actionsSlot}
    </Card.Root>
  )

  return wrapper ? wrapper(content) : content
}
