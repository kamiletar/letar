'use client'

import { Box, type BoxProps } from '@chakra-ui/react'
import { forwardRef, memo } from 'react'

interface CardBaseProps extends BoxProps {
  /** Цвет бордера при hover (по умолчанию purple.500) */
  hoverColor?: string
  /** Включить эффект поднятия при hover */
  liftOnHover?: boolean
  /** Вариант цвета фона: default (white/gray.900), muted (gray.50/gray.900) */
  variant?: 'default' | 'muted'
}

/**
 * Базовый компонент карточки с hover-эффектами.
 * Используется как основа для всех карточных компонентов.
 */
export const CardBase = memo(
  forwardRef<HTMLDivElement, CardBaseProps>(function CardBase(
    { hoverColor = 'purple.500', liftOnHover = true, variant = 'default', children, ...props },
    ref
  ) {
    const bgColor = variant === 'muted' ? { base: 'gray.50', _dark: 'gray.900' } : { base: 'white', _dark: 'gray.900' }

    return (
      <Box
        ref={ref}
        p={6}
        borderRadius="xl"
        bg={bgColor}
        border="1px solid"
        borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
        _hover={
          liftOnHover
            ? {
                borderColor: hoverColor,
                transform: 'translateY(-4px)',
                boxShadow: 'lg',
              }
            : { borderColor: hoverColor }
        }
        transition="all 0.3s"
        {...props}
      >
        {children}
      </Box>
    )
  })
)
