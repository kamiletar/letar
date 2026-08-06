'use client'

/**
 * Управление скоростью вращения мандалы.
 */

import { Box, HStack, Slider, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { formatMsToSeconds, SliderControl } from './slider-control'

// =============================================================================
// Константы
// =============================================================================

/**
 * Предустановленные значения для слайдера скорости вращения.
 * Нелинейная шкала: мелкий шаг в начале, крупный в конце.
 */
export const SPIN_DURATION_STEPS = [
  // 1-10 сек (шаг 1)
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  // 15-60 сек (шаг 5)
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  // 2-10 мин (шаг 1 мин)
  120,
  180,
  240,
  300,
  360,
  420,
  480,
  540,
  600,
  // 15-60 мин (шаг 5 мин)
  900,
  1200,
  1500,
  1800,
  2100,
  2400,
  2700,
  3000,
  3300,
  3600,
] as const

// =============================================================================
// Утилиты
// =============================================================================

/**
 * Найти ближайший индекс в массиве для заданного значения
 */
export function findClosestStepIndex(value: number): number {
  let closestIndex = 0
  let closestDiff = Math.abs(SPIN_DURATION_STEPS[0] - value)

  for (let i = 1; i < SPIN_DURATION_STEPS.length; i++) {
    const diff = Math.abs(SPIN_DURATION_STEPS[i] - value)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = i
    }
  }

  return closestIndex
}

/**
 * Форматирование скорости для отображения
 */
export function formatSpeed(duration: number): string {
  if (duration < 60) {
    return `${duration} сек`
  }
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return seconds > 0 ? `${minutes}м ${seconds}с` : `${minutes} мин`
}

// =============================================================================
// Компоненты
// =============================================================================

interface SpinSpeedSliderProps {
  /** Текущая длительность вращения в секундах */
  spinDuration: number
  /** Callback при изменении */
  onChange: (duration: number) => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

/**
 * Слайдер скорости вращения с нелинейной шкалой.
 * Использует индексную систему для нелинейного распределения значений.
 */
export function SpinSpeedSlider({ spinDuration, onChange, variant = 'normal' }: SpinSpeedSliderProps) {
  const spinDurationIndex = useMemo(() => findClosestStepIndex(spinDuration), [spinDuration])

  const handleSliderChange = useCallback(
    (index: number) => {
      const newDuration = SPIN_DURATION_STEPS[index]
      onChange(newDuration)
    },
    [onChange],
  )

  const isFullscreen = variant === 'fullscreen'

  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <Text color={isFullscreen ? 'white' : 'gray.300'} fontSize="sm">
          {isFullscreen ? 'Вращение' : 'Скорость вращения'}
        </Text>
        <Text color={isFullscreen ? 'purple.300' : 'purple.400'} fontSize="sm">
          {formatSpeed(spinDuration)}
        </Text>
      </HStack>
      <Slider.Root
        value={[spinDurationIndex]}
        onValueChange={(details) => handleSliderChange(details.value[0])}
        min={0}
        max={SPIN_DURATION_STEPS.length - 1}
        step={1}
        colorPalette="purple"
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumb index={0} />
        </Slider.Control>
      </Slider.Root>
    </Box>
  )
}

interface GradientSpeedSliderProps {
  /** Длительность анимации градиента в мс */
  gradientDuration: number
  /** Callback при изменении */
  onChange: (duration: number) => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

/**
 * Слайдер скорости анимации градиента.
 */
export function GradientSpeedSlider({ gradientDuration, onChange, variant = 'normal' }: GradientSpeedSliderProps) {
  const isFullscreen = variant === 'fullscreen'

  return (
    <SliderControl
      label={isFullscreen ? 'Градиент' : 'Скорость градиента'}
      value={gradientDuration}
      onChange={onChange}
      min={1000}
      max={10000}
      step={500}
      colorPalette="orange"
      formatValue={formatMsToSeconds}
      variant={variant}
    />
  )
}
