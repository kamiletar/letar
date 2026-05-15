'use client'

/**
 * Поле ввода смещения синхронизации (в миллисекундах)
 *
 * Положительное значение: донор опережает → обрезать начало дорожек
 * Отрицательное значение: донор отстаёт → добавить тишину в начало
 */

import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuMinus, LuPlus } from 'react-icons/lu'

interface OffsetInputProps {
  /** Текущее смещение в миллисекундах */
  value: number
  /** Callback при изменении */
  onChange: (value: number) => void
  /** Метка (опционально) */
  label?: string
  /** Подсказка (опционально) */
  hint?: string
  /** Показывать кнопки быстрой подстройки */
  showButtons?: boolean
}

/**
 * Форматирование времени для отображения
 */
function formatTime(ms: number): string {
  const absMs = Math.abs(ms)
  const sign = ms < 0 ? '-' : '+'
  const seconds = Math.floor(absMs / 1000)
  const milliseconds = absMs % 1000

  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${sign}${minutes}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
  }

  return `${sign}${seconds}.${milliseconds.toString().padStart(3, '0')}s`
}

export function OffsetInput({
  value,
  onChange,
  label = 'Смещение синхронизации',
  hint,
  showButtons = true,
}: OffsetInputProps) {
  // Локальное состояние для ввода
  const [inputValue, setInputValue] = useState(value.toString())

  // Синхронизация с внешним значением
  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  // Обработка ввода
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)

    // Парсим только числа (с минусом)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      // Не вызываем onChange при каждом нажатии — только на blur
    }
  }, [])

  // Применение значения при потере фокуса
  const handleBlur = useCallback(() => {
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed)) {
      onChange(parsed)
    } else {
      // Вернуть предыдущее значение
      setInputValue(value.toString())
    }
  }, [inputValue, onChange, value])

  // Enter применяет значение
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        const parsed = parseInt(inputValue, 10)
        if (!isNaN(parsed)) {
          onChange(parsed)
        }
      }
    },
    [inputValue, onChange]
  )

  // Быстрые кнопки
  const adjust = useCallback(
    (delta: number) => {
      onChange(value + delta)
    },
    [onChange, value]
  )

  return (
    <VStack gap={2} align="stretch">
      {/* Метка */}
      <Text fontSize="sm" fontWeight="medium" color="fg.muted">
        {label}
      </Text>

      {/* Основной контрол */}
      <HStack gap={2}>
        {/* Кнопки -100/-10 */}
        {showButtons && (
          <HStack gap={1}>
            <Button size="sm" variant="outline" onClick={() => adjust(-100)} title="-100 мс">
              <LuMinus />
              100
            </Button>
            <Button size="sm" variant="outline" onClick={() => adjust(-10)} title="-10 мс">
              <LuMinus />
              10
            </Button>
          </HStack>
        )}

        {/* Поле ввода */}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          textAlign="center"
          w="120px"
          fontFamily="mono"
          placeholder="0"
        />

        {/* Кнопки +10/+100 */}
        {showButtons && (
          <HStack gap={1}>
            <Button size="sm" variant="outline" onClick={() => adjust(10)} title="+10 мс">
              <LuPlus />
              10
            </Button>
            <Button size="sm" variant="outline" onClick={() => adjust(100)} title="+100 мс">
              <LuPlus />
              100
            </Button>
          </HStack>
        )}
      </HStack>

      {/* Форматированное время */}
      <HStack justify="space-between">
        <Text fontSize="xs" color="fg.subtle">
          мс
        </Text>
        <Text fontSize="sm" color={value === 0 ? 'fg.muted' : value > 0 ? 'green.400' : 'orange.400'} fontFamily="mono">
          {formatTime(value)}
        </Text>
      </HStack>

      {/* Подсказка */}
      {hint && (
        <Text fontSize="xs" color="fg.subtle">
          {hint}
        </Text>
      )}

      {/* Автоматическая подсказка */}
      {!hint && (
        <Box fontSize="xs" color="fg.subtle">
          {value === 0 && <Text>Без смещения</Text>}
          {value > 0 && <Text>Донор опережает → обрежем {formatTime(value)} в начале дорожек</Text>}
          {value < 0 && <Text>Донор отстаёт → добавим {formatTime(Math.abs(value))} тишины в начало</Text>}
        </Box>
      )}
    </VStack>
  )
}
