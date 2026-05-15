'use client'

import type { ImotLevel } from '@/lib/theme'
import { imotColors } from '@/lib/theme'
import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import { LevelIcon } from './level-icon'
import { ProgressCircle } from './progress-circle'

interface LevelVisualizationProps {
  /**
   * Тип уровня диагностики
   */
  level: ImotLevel

  /**
   * Прогресс заполнения (0-100)
   */
  progress: number

  /**
   * Заголовок визуализации
   */
  title: string

  /**
   * Описание или статус
   */
  description?: string

  /**
   * Количество заполненных полей
   */
  filledFields?: number

  /**
   * Общее количество полей
   */
  totalFields?: number

  /**
   * Вариант отображения
   */
  variant?: 'compact' | 'detailed'

  /**
   * Показывать ли кнопку действия
   */
  showAction?: boolean

  /**
   * Обработчик клика
   */
  onClick?: () => void
}

/**
 * Компонент для визуализации уровня диагностики с прогрессом
 */
export function LevelVisualization({
  level,
  progress,
  title,
  description,
  filledFields,
  totalFields,
  variant = 'compact',
  showAction: _showAction = false,
  onClick,
}: LevelVisualizationProps) {
  const levelConfig = imotColors[level]

  if (variant === 'compact') {
    return (
      <Box
        p={4}
        borderRadius="lg"
        bg={levelConfig.bg}
        border="2px solid"
        borderColor={levelConfig.border}
        cursor={onClick ? 'pointer' : 'default'}
        transition="all 0.3s ease"
        _hover={
          onClick
            ? {
                transform: 'translateY(-2px)',
                shadow: 'md',
              }
            : undefined
        }
        onClick={onClick}
      >
        <HStack justify="space-between" align="center">
          <HStack gap={3}>
            <LevelIcon level={level} size="lg" />
            <VStack align="start" gap={0}>
              <Text fontWeight="bold" color={levelConfig.text}>
                {title}
              </Text>
              {description && (
                <Text fontSize="sm" color="gray.600">
                  {description}
                </Text>
              )}
            </VStack>
          </HStack>

          <HStack gap={3}>
            {filledFields !== undefined && totalFields !== undefined && (
              <Badge colorPalette={progress === 100 ? 'green' : 'gray'} variant="subtle">
                {filledFields}/{totalFields}
              </Badge>
            )}
            <Box
              width="40px"
              height="40px"
              borderRadius="full"
              bg={levelConfig.primary}
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontWeight="bold"
              fontSize="sm"
            >
              {Math.round(progress)}%
            </Box>
          </HStack>
        </HStack>
      </Box>
    )
  }

  // Detailed variant
  return (
    <Box
      p={6}
      borderRadius="lg"
      bg={levelConfig.bg}
      border="2px solid"
      borderColor={levelConfig.border}
      cursor={onClick ? 'pointer' : 'default'}
      transition="all 0.3s ease"
      _hover={
        onClick
          ? {
              transform: 'translateY(-2px)',
              shadow: 'lg',
            }
          : undefined
      }
      onClick={onClick}
    >
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between">
          <HStack gap={3}>
            <LevelIcon level={level} size="xl" />
            <VStack align="start" gap={0}>
              <Text fontSize="xl" fontWeight="bold" color={levelConfig.text}>
                {title}
              </Text>
              {description && (
                <Text fontSize="sm" color="gray.600">
                  {description}
                </Text>
              )}
            </VStack>
          </HStack>

          {filledFields !== undefined && totalFields !== undefined && (
            <Badge colorPalette={progress === 100 ? 'green' : 'gray'} variant="solid" fontSize="md" px={3} py={1}>
              {filledFields}/{totalFields} полей
            </Badge>
          )}
        </HStack>

        {/* Прогресс */}
        <Box display="flex" justifyContent="center">
          <ProgressCircle value={progress} size={120} color={levelConfig.primary} showPercentage />
        </Box>

        {/* Статус */}
        <Box textAlign="center">
          {progress === 100 ? (
            <Text color="green.600" fontWeight="medium">
              ✓ Профиль полностью заполнен
            </Text>
          ) : progress > 0 ? (
            <Text color={levelConfig.text} fontWeight="medium">
              Заполнение в процессе
            </Text>
          ) : (
            <Text color="gray.500" fontWeight="medium">
              Профиль не заполнен
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  )
}
