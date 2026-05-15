'use client'

/**
 * StreakBadge — отображение серии занятий без пропусков
 *
 * Показывает текущую серию занятий и мотивирует продолжать обучение
 *
 * @module streak-badge
 */

import { Badge, Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { Tooltip } from '@letar/ui'
import { LuFlame, LuStar, LuTrophy, LuZap } from 'react-icons/lu'

// Анимация пульсации огня
const pulseAnimation = keyframes({
  '0%, 100%': {
    transform: 'scale(1)',
    opacity: 1,
  },
  '50%': {
    transform: 'scale(1.1)',
    opacity: 0.8,
  },
})

// Анимация мерцания
const glowAnimation = keyframes({
  '0%, 100%': {
    filter: 'drop-shadow(0 0 2px rgba(255, 165, 0, 0.5))',
  },
  '50%': {
    filter: 'drop-shadow(0 0 8px rgba(255, 165, 0, 0.8))',
  },
})

interface StreakBadgeProps {
  /** Текущая серия занятий */
  currentStreak: number
  /** Рекордная серия */
  longestStreak?: number
  /** Дата последнего занятия */
  lastLessonDate?: Date | null
  /** Компактный режим (только иконка и число) */
  compact?: boolean
}

/**
 * Получить уровень серии и соответствующие стили
 */
function getStreakLevel(streak: number): {
  level: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond'
  color: string
  icon: typeof LuFlame
  label: string
} {
  if (streak >= 20) {
    return { level: 'diamond', color: 'purple', icon: LuTrophy, label: 'Легенда!' }
  }
  if (streak >= 10) {
    return { level: 'gold', color: 'yellow', icon: LuStar, label: 'Мастер!' }
  }
  if (streak >= 5) {
    return { level: 'silver', color: 'orange', icon: LuZap, label: 'Отлично!' }
  }
  if (streak >= 3) {
    return { level: 'bronze', color: 'orange', icon: LuFlame, label: 'Молодец!' }
  }
  return { level: 'none', color: 'gray', icon: LuFlame, label: '' }
}

/**
 * Проверить, активна ли серия (было занятие в последние 7 дней)
 */
function isStreakActive(lastLessonDate: Date | null | undefined): boolean {
  if (!lastLessonDate) {
    return false
  }
  const daysSinceLast = Math.floor((Date.now() - new Date(lastLessonDate).getTime()) / (1000 * 60 * 60 * 24))
  return daysSinceLast <= 7
}

/**
 * Компонент StreakBadge
 *
 * @example
 * ```tsx
 * // Простое использование
 * <StreakBadge currentStreak={5} />
 *
 * // С рекордом и датой
 * <StreakBadge
 *   currentStreak={7}
 *   longestStreak={12}
 *   lastLessonDate={new Date('2024-01-15')}
 * />
 *
 * // Компактный режим
 * <StreakBadge currentStreak={3} compact />
 * ```
 */
export function StreakBadge({ currentStreak, longestStreak, lastLessonDate, compact = false }: StreakBadgeProps) {
  const { color, icon: StreakIcon, label } = getStreakLevel(currentStreak)
  const active = isStreakActive(lastLessonDate)

  // Не показываем бейдж если серия пустая
  if (currentStreak === 0) {
    return null
  }

  // Компактный режим
  if (compact) {
    return (
      <Tooltip content={`Серия: ${currentStreak} занятий${longestStreak ? ` (рекорд: ${longestStreak})` : ''}`}>
        <Badge
          colorPalette={color}
          size="sm"
          display="flex"
          alignItems="center"
          gap={1}
          animation={active ? `${pulseAnimation} 2s ease-in-out infinite` : undefined}
        >
          <Icon boxSize={3}>
            <StreakIcon />
          </Icon>
          {currentStreak}
        </Badge>
      </Tooltip>
    )
  }

  // Полный режим
  return (
    <Box
      p={3}
      borderRadius="lg"
      bg={`${color}.50`}
      borderWidth="1px"
      borderColor={`${color}.200`}
      _dark={{
        bg: `${color}.950`,
        borderColor: `${color}.800`,
      }}
    >
      <HStack gap={3}>
        {/* Иконка с анимацией */}
        <Box color={`${color}.500`} animation={active ? `${glowAnimation} 1.5s ease-in-out infinite` : undefined}>
          <Icon boxSize={8}>
            <StreakIcon />
          </Icon>
        </Box>

        <VStack align="flex-start" gap={0}>
          <HStack gap={2}>
            <Text fontWeight="bold" fontSize="lg">
              {currentStreak} занятий подряд
            </Text>
            {label && (
              <Badge colorPalette={color} size="sm">
                {label}
              </Badge>
            )}
          </HStack>

          <HStack gap={4} color="fg.muted" fontSize="sm">
            {longestStreak && longestStreak > currentStreak && <Text>Рекорд: {longestStreak}</Text>}
            {!active && <Text color="orange.500">Серия может прерваться! Запишитесь на занятие</Text>}
          </HStack>
        </VStack>
      </HStack>
    </Box>
  )
}

/**
 * Мини-версия для отображения в карточках
 */
export function StreakBadgeMini({ currentStreak }: { currentStreak: number }) {
  if (currentStreak < 3) {
    return null
  }

  const { color, icon: StreakIcon } = getStreakLevel(currentStreak)

  return (
    <HStack gap={1} color={`${color}.500`} fontSize="xs" fontWeight="medium">
      <Icon boxSize={3}>
        <StreakIcon />
      </Icon>
      <Text>{currentStreak}</Text>
    </HStack>
  )
}
