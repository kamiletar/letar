'use client'

import type { Gender } from '@/generated/prisma'
import { Badge, Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface ProductSize {
  id: string
  gender: Gender
  international: string
  ru: string
  de: string
  it: string
  fr: string
  uk: string
  us: string
  bustMin: number
  bustMax: number
  waistMin: number
  waistMax: number
  hipsMin: number
  hipsMax: number
}

interface LiveSizeRecommendationProps {
  sizes: ProductSize[]
  gender: Gender
  bust?: number | ''
  waist?: number | ''
  hips?: number | ''
  onSizeSelect?: (sizeRu: string) => void
}

/**
 * Client Component для живой рекомендации размеров при вводе замеров.
 * Обновляется в реальном времени при изменении полей формы.
 * Клик по размеру автоматически заполняет поле "Предпочтительный размер".
 */
type MatchType = 'exact' | 'partial' | 'nearest'

export function LiveSizeRecommendation({
  sizes,
  gender,
  bust,
  waist,
  hips,
  onSizeSelect,
}: LiveSizeRecommendationProps) {
  const [matchingSizes, setMatchingSizes] = useState<ProductSize[]>([])
  const [partialMatches, setPartialMatches] = useState<ProductSize[]>([])
  const [matchType, setMatchType] = useState<MatchType | null>(null)

  useEffect(() => {
    // Фильтруем размеры по полу
    const genderSizes = sizes.filter((size) => size.gender === gender)

    // Преобразуем значения в числа или null
    const bustValue = typeof bust === 'number' ? bust : null
    const waistValue = typeof waist === 'number' ? waist : null
    const hipsValue = typeof hips === 'number' ? hips : null

    // Проверяем условия до вызова setState
    const shouldClear = genderSizes.length === 0 || (!bustValue && !waistValue && !hipsValue)

    if (shouldClear) {
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => {
        setMatchingSizes([])
        setPartialMatches([])
      }, 0)
      return
    }

    /**
     * Вычисляет расстояние от замера до диапазона размера.
     * Возвращает 0 если замер в диапазоне, иначе минимальное расстояние до границы.
     */
    const calculateParamDistance = (measurement: number | null, min: number, max: number): number => {
      if (measurement === null) {
        return 0
      } // Если замер не указан, не считаем его
      if (measurement >= min && measurement <= max) {
        return 0
      } // В диапазоне
      if (measurement < min) {
        return min - measurement
      } // Расстояние до нижней границы
      return measurement - max // Расстояние до верхней границы
    }

    /**
     * Вычисляет общее расстояние с учетом весов (как в size-utils.ts).
     * Hips важнее всего (1.5x), потом bust (1.2x), затем waist (1.0x).
     */
    const calculateSizeDistance = (size: ProductSize) => {
      const bustDistance = calculateParamDistance(bustValue, size.bustMin, size.bustMax)
      const waistDistance = calculateParamDistance(waistValue, size.waistMin, size.waistMax)
      const hipsDistance = calculateParamDistance(hipsValue, size.hipsMin, size.hipsMax)

      // Подсчет точных совпадений
      const matchedParams: ('bust' | 'waist' | 'hips')[] = []
      if (bustValue !== null && bustDistance === 0) {
        matchedParams.push('bust')
      }
      if (waistValue !== null && waistDistance === 0) {
        matchedParams.push('waist')
      }
      if (hipsValue !== null && hipsDistance === 0) {
        matchedParams.push('hips')
      }

      // Взвешенное расстояние (приоритет: бедра > грудь > талия)
      const distance = hipsDistance * 1.5 + bustDistance * 1.2 + waistDistance * 1.0

      return { distance, matchedParams }
    }

    // Вычисляем расстояния для всех размеров
    const sizesWithDistance = genderSizes.map((size) => ({
      size,
      ...calculateSizeDistance(size),
    }))

    // Сортируем по расстоянию (ближайшие первыми)
    sizesWithDistance.sort((a, b) => a.distance - b.distance)

    // Подсчитываем сколько параметров введено
    const enteredParamsCount = [bustValue, waistValue, hipsValue].filter((v) => v !== null).length

    // Exact matches: все введенные параметры совпадают
    const exactMatches = sizesWithDistance.filter(
      (item) => item.matchedParams.length === enteredParamsCount && item.distance === 0
    )

    // Partial matches: минимум 2 параметра совпадают
    const partialMatchesList =
      exactMatches.length === 0
        ? sizesWithDistance.filter(
            (item) => item.matchedParams.length >= 2 && item.matchedParams.length < enteredParamsCount
          )
        : []

    // Nearest matches: если нет exact/partial, берем топ-3 ближайших
    const nearestMatches =
      exactMatches.length === 0 && partialMatchesList.length === 0 ? sizesWithDistance.slice(0, 3) : []

    // Устанавливаем результаты и тип совпадения
    // This is synchronous computation that updates state based on props

    if (exactMatches.length > 0) {
      setMatchingSizes(exactMatches.map((item) => item.size))

      setPartialMatches([])

      setMatchType('exact')
    } else if (partialMatchesList.length > 0) {
      setMatchingSizes([])

      setPartialMatches(partialMatchesList.slice(0, 3).map((item) => item.size))

      setMatchType('partial')
    } else if (nearestMatches.length > 0) {
      setMatchingSizes([])

      setPartialMatches(nearestMatches.map((item) => item.size))

      setMatchType('nearest')
    } else {
      setMatchingSizes([])

      setPartialMatches([])

      setMatchType(null)
    }
  }, [sizes, gender, bust, waist, hips])

  const recommendedSizes = matchingSizes.length > 0 ? matchingSizes : partialMatches

  // Если нет ни одного значения - показываем placeholder
  const bustValue = typeof bust === 'number' ? bust : null
  const waistValue = typeof waist === 'number' ? waist : null
  const hipsValue = typeof hips === 'number' ? hips : null

  if (!bustValue && !waistValue && !hipsValue) {
    return (
      <Text color="fg.muted" fontSize="sm">
        💡 Начните вводить замеры, чтобы увидеть подходящие размеры
      </Text>
    )
  }

  if (recommendedSizes.length === 0) {
    return (
      <VStack align="start" gap={3}>
        <Text color="fg.muted">
          К сожалению, не удалось найти совпадения по вашим замерам. Попробуйте ввести все измерения (грудь, талия,
          бедра) для более точного результата.
        </Text>
        <Text fontSize="sm" color="fg.muted">
          💡 Совет: проверьте правильность введенных измерений
        </Text>
      </VStack>
    )
  }

  // Определяем цвета и текст на основе типа совпадения
  const getMatchConfig = () => {
    switch (matchType) {
      case 'exact':
        return {
          badgeColor: 'green',
          borderColor: 'green.200',
          bg: 'green.50',
          borderColorHover: 'green.400',
          bgHover: 'green.100',
          badge: '✅ Точное совпадение',
          message: '✅ На основе ваших замеров подходят следующие размеры:',
        }
      case 'partial':
        return {
          badgeColor: 'yellow',
          borderColor: 'yellow.200',
          bg: 'yellow.50',
          borderColorHover: 'yellow.400',
          bgHover: 'yellow.100',
          badge: '⚠️ Частичное совпадение',
          message: '⚠️ Частичное совпадение (введите все замеры для точной рекомендации):',
        }
      case 'nearest':
        return {
          badgeColor: 'orange',
          borderColor: 'orange.200',
          bg: 'orange.50',
          borderColorHover: 'orange.400',
          bgHover: 'orange.100',
          badge: '📏 Ближайшие размеры',
          message: '📏 Ближайшие размеры по вашим замерам (могут отличаться):',
        }
      default:
        return null
    }
  }

  const matchConfig = getMatchConfig()

  return (
    <VStack align="start" gap={4}>
      {matchConfig && (
        <Badge colorPalette={matchConfig.badgeColor} variant="subtle" fontSize="sm">
          {matchConfig.badge}
        </Badge>
      )}

      {matchConfig && (
        <Text fontWeight="medium" fontSize="sm">
          {matchConfig.message}
        </Text>
      )}

      {onSizeSelect && matchConfig && (
        <Text fontSize="xs" color="fg.muted">
          💡 Нажмите на размер, чтобы автоматически заполнить поле "Предпочтительный размер"
        </Text>
      )}

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3} w="full">
        {recommendedSizes.map((size) => (
          <Box
            key={size.id}
            p={3}
            borderWidth="1px"
            borderRadius="md"
            borderColor={matchConfig?.borderColor}
            bg={matchConfig?.bg}
            cursor={onSizeSelect ? 'pointer' : 'default'}
            onClick={() => onSizeSelect?.(size.ru)}
            transition="all 0.2s"
            _hover={
              onSizeSelect && matchConfig
                ? {
                    borderColor: matchConfig.borderColorHover,
                    bg: matchConfig.bgHover,
                    transform: 'translateY(-2px)',
                    shadow: 'md',
                  }
                : {}
            }
            role={onSizeSelect ? 'button' : undefined}
            tabIndex={onSizeSelect ? 0 : undefined}
            onKeyDown={
              onSizeSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSizeSelect(size.ru)
                    }
                  }
                : undefined
            }
          >
            <VStack align="start" gap={1.5}>
              <HStack justify="space-between" w="full">
                <Text fontWeight="bold" fontSize="md">
                  RU {size.ru}
                </Text>
                <Badge colorPalette={matchConfig?.badgeColor ?? 'gray'} size="sm">
                  {size.international}
                </Badge>
              </HStack>

              <Text fontSize="xs" color="fg.muted">
                DE {size.de} • IT {size.it} • FR {size.fr}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                UK {size.uk} • US {size.us}
              </Text>

              {/* Показываем диапазоны измерений */}
              <Box pt={1} fontSize="xs" color="fg.muted">
                <Text>
                  Грудь: {size.bustMin}-{size.bustMax} см
                </Text>
                <Text>
                  Талия: {size.waistMin}-{size.waistMax} см
                </Text>
                <Text>
                  Бедра: {size.hipsMin}-{size.hipsMax} см
                </Text>
              </Box>
            </VStack>
          </Box>
        ))}
      </Grid>

      {matchType === 'partial' && (
        <Text fontSize="xs" color="fg.muted">
          💡 Для более точной рекомендации заполните все измерения (грудь, талия, бедра)
        </Text>
      )}

      {matchType === 'nearest' && (
        <Text fontSize="xs" color="fg.muted">
          ⚠️ Ни один размер не совпал точно. Показаны ближайшие варианты. Рекомендуем проконсультироваться или ввести
          точные замеры.
        </Text>
      )}
    </VStack>
  )
}
