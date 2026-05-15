'use client'

/**
 * Универсальный компонент слайдера с лейблом и отображением значения.
 * Используется для громкости, скорости, чувствительности и других настроек.
 */

import { Box, HStack, Slider, Text } from '@chakra-ui/react'

// =============================================================================
// Типы
// =============================================================================

export interface SliderControlProps {
  /** Текущее значение */
  value: number
  /** Callback при изменении */
  onChange: (value: number) => void
  /** Лейбл слайдера */
  label: string
  /** Минимальное значение */
  min: number
  /** Максимальное значение */
  max: number
  /** Шаг изменения */
  step?: number
  /** Цветовая палитра */
  colorPalette?: string
  /** Форматтер для отображения значения */
  formatValue?: (value: number) => string
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
  /** Скрыть заголовок (только слайдер) */
  hideLabel?: boolean
}

// =============================================================================
// Форматтеры
// =============================================================================

/**
 * Форматирование процентов
 */
export const formatPercent = (value: number): string => `${value}%`

/**
 * Форматирование секунд
 */
export const formatSeconds = (value: number): string => `${value}с`

/**
 * Форматирование миллисекунд в секунды
 */
export const formatMsToSeconds = (value: number): string => `${(value / 1000).toFixed(1)}с`

/**
 * Форматирование длительности (секунды → мин/сек)
 */
export const formatDuration = (duration: number): string => {
  if (duration < 60) {
    return `${duration} сек`
  }
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return seconds > 0 ? `${minutes}м ${seconds}с` : `${minutes} мин`
}

// =============================================================================
// Компонент
// =============================================================================

/**
 * Универсальный слайдер с лейблом и отображением текущего значения.
 *
 * @example
 * ```tsx
 * <SliderControl
 *   label="Громкость"
 *   value={volume}
 *   onChange={setVolume}
 *   min={0}
 *   max={100}
 *   colorPalette="pink"
 *   formatValue={formatPercent}
 * />
 * ```
 */
export function SliderControl({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  colorPalette = 'purple',
  formatValue,
  variant = 'normal',
  hideLabel = false,
}: SliderControlProps) {
  const isFullscreen = variant === 'fullscreen'
  const displayValue = formatValue ? formatValue(value) : String(value)

  // Только слайдер без обёртки (для fullscreen VolumeSlider)
  if (hideLabel) {
    return (
      <Slider.Root
        value={[value]}
        onValueChange={(details) => onChange(details.value[0])}
        min={min}
        max={max}
        step={step}
        colorPalette={colorPalette}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          {/* Увеличенный thumb для touch (минимум 32×32px) */}
          <Slider.Thumb index={0} boxSize={{ base: '32px', md: '20px' }} />
        </Slider.Control>
      </Slider.Root>
    )
  }

  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color={isFullscreen ? 'white' : 'fg.muted'}>
          {label}
        </Text>
        <Text fontSize="sm" color={`${colorPalette}.400`}>
          {displayValue}
        </Text>
      </HStack>
      <Slider.Root
        value={[value]}
        onValueChange={(details) => onChange(details.value[0])}
        min={min}
        max={max}
        step={step}
        colorPalette={colorPalette}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          {/* Увеличенный thumb для touch (минимум 32×32px) */}
          <Slider.Thumb index={0} boxSize={{ base: '32px', md: '20px' }} />
        </Slider.Control>
      </Slider.Root>
    </Box>
  )
}
