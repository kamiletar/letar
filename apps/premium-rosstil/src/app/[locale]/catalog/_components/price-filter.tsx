'use client'

import { Box, HStack, NumberInput, Slider, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

interface PriceFilterProps {
  /** Минимальное значение диапазона */
  min: number
  /** Максимальное значение диапазона */
  max: number
  /** Текущее минимальное значение фильтра */
  currentMin?: number
  /** Текущее максимальное значение фильтра */
  currentMax?: number
  /** Колбэк при изменении диапазона цены */
  onPriceChange: (min: number | undefined, max: number | undefined) => void
}

/**
 * Компонент фильтра по цене со слайдером и полями ввода.
 * Использует Chakra UI Slider с двумя thumb'ами для выбора диапазона
 * и NumberInput для точного ввода значений.
 */
export function PriceFilter({ min, max, currentMin, currentMax, onPriceChange }: PriceFilterProps) {
  // Локальное состояние для мгновенного отклика UI
  const [localRange, setLocalRange] = useState<[number, number]>([currentMin ?? min, currentMax ?? max])

  // Обновляем локальное состояние при изменении props
  // (когда пользователь сбрасывает фильтры)
  const effectiveMin = currentMin ?? min
  const effectiveMax = currentMax ?? max

  // Обработчик изменения слайдера (мгновенный отклик)
  const handleSliderChange = useCallback((details: { value: number[] }) => {
    setLocalRange([details.value[0], details.value[1]])
  }, [])

  // Обработчик завершения перемещения слайдера (обновление URL)
  const handleSliderChangeEnd = useCallback(
    (details: { value: number[] }) => {
      const newMin = details.value[0] === min ? undefined : details.value[0]
      const newMax = details.value[1] === max ? undefined : details.value[1]
      onPriceChange(newMin, newMax)
    },
    [min, max, onPriceChange]
  )

  // Обработчик изменения минимального значения через input
  const handleMinInputChange = useCallback(
    (details: { value: string }) => {
      const value = parseInt(details.value, 10)
      if (!isNaN(value) && value >= min && value <= localRange[1]) {
        setLocalRange([value, localRange[1]])
        const newMin = value === min ? undefined : value
        onPriceChange(newMin, localRange[1] === max ? undefined : localRange[1])
      }
    },
    [min, max, localRange, onPriceChange]
  )

  // Обработчик изменения максимального значения через input
  const handleMaxInputChange = useCallback(
    (details: { value: string }) => {
      const value = parseInt(details.value, 10)
      if (!isNaN(value) && value <= max && value >= localRange[0]) {
        setLocalRange([localRange[0], value])
        const newMax = value === max ? undefined : value
        onPriceChange(localRange[0] === min ? undefined : localRange[0], newMax)
      }
    },
    [min, max, localRange, onPriceChange]
  )

  // Форматируем цену для отображения
  const formatPrice = (value: number) =>
    value.toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  return (
    <Box data-testid="filter-price" minWidth="220px">
      <VStack align="stretch" gap={2}>
        <Text fontSize="sm" fontWeight="medium">
          Цена
        </Text>

        {/* Слайдер с двумя thumb'ами */}
        <Slider.Root
          min={min}
          max={max}
          step={100}
          value={[effectiveMin, effectiveMax]}
          onValueChange={handleSliderChange}
          onValueChangeEnd={handleSliderChangeEnd}
          minStepsBetweenThumbs={1}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>

        {/* Поля ввода для точного значения */}
        <HStack gap={2}>
          <NumberInput.Root
            size="sm"
            min={min}
            max={localRange[1]}
            value={String(localRange[0])}
            onValueChange={handleMinInputChange}
            formatOptions={{
              style: 'decimal',
              useGrouping: true,
            }}
          >
            <NumberInput.Control>
              <NumberInput.Input placeholder="от" />
            </NumberInput.Control>
          </NumberInput.Root>

          <Text color="fg.muted">—</Text>

          <NumberInput.Root
            size="sm"
            min={localRange[0]}
            max={max}
            value={String(localRange[1])}
            onValueChange={handleMaxInputChange}
            formatOptions={{
              style: 'decimal',
              useGrouping: true,
            }}
          >
            <NumberInput.Control>
              <NumberInput.Input placeholder="до" />
            </NumberInput.Control>
          </NumberInput.Root>
        </HStack>

        {/* Отображение текущего диапазона */}
        <Text fontSize="xs" color="fg.muted" textAlign="center">
          {formatPrice(localRange[0])} — {formatPrice(localRange[1])}
        </Text>
      </VStack>
    </Box>
  )
}
