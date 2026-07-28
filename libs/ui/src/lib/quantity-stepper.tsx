'use client'

import { HStack, IconButton, type StackProps, Text } from '@chakra-ui/react'
import { LuMinus, LuPlus } from 'react-icons/lu'

export interface QuantityStepperProps extends Omit<StackProps, 'onChange'> {
  /** Текущее количество */
  value: number
  /** Вызывается с новым количеством после клика по −/+ */
  onChange: (value: number) => void
  /** Минимум, по умолчанию 1 */
  min?: number
  /** Максимум, по умолчанию 99 */
  max?: number
  /** Блокирует обе кнопки — например пока идёт запрос */
  disabled?: boolean
  /** Размер кнопок */
  size?: 'sm' | 'md' | 'lg'
  /** Подпись для скринридера: «Количество товара X» */
  ariaLabel?: string
}

const WIDTH_BY_SIZE = { sm: '8', md: '10', lg: '12' } as const

/**
 * Степпер количества штук: −  N  +
 *
 * Поля ввода намеренно нет — в интернет-магазине количество набирают кликами,
 * а свободный ввод только провоцирует опечатки вроде «11» вместо «1».
 * Значение всегда целое и зажато в [min, max].
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'md',
  ariaLabel = 'Количество',
  ...props
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(Math.max(Math.round(next), min), max)

  return (
    <HStack
      gap={0}
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      overflow="hidden"
      width="fit-content"
      {...props}
    >
      <IconButton
        aria-label={`Уменьшить: ${ariaLabel}`}
        variant="ghost"
        size={size}
        borderRadius="0"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <LuMinus />
      </IconButton>

      <Text
        minW={WIDTH_BY_SIZE[size]}
        textAlign="center"
        fontWeight="semibold"
        fontVariantNumeric="tabular-nums"
        aria-live="polite"
        aria-label={`${ariaLabel}: ${value}`}
      >
        {value}
      </Text>

      <IconButton
        aria-label={`Увеличить: ${ariaLabel}`}
        variant="ghost"
        size={size}
        borderRadius="0"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <LuPlus />
      </IconButton>
    </HStack>
  )
}
