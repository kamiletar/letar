'use client'

import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, type BoxProps, Button, Heading, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface EmptyStateProps extends Omit<BoxProps, 'direction'> {
  /** Иконка (React element) */
  icon: ReactNode
  /** Заголовок */
  title: string
  /** Описание */
  description?: string
  /** Текст кнопки действия */
  actionLabel?: string
  /** Ссылка кнопки действия */
  actionHref?: string
  /** Цветовая палитра кнопки */
  actionColorPalette?: string
}

/**
 * Компонент для отображения пустого состояния.
 * Используется когда список пуст или данные отсутствуют.
 *
 * @example
 * <EmptyState
 *   icon={<LuShoppingCart size={64} />}
 *   title="Корзина пуста"
 *   description="Добавьте товары из магазина"
 *   actionLabel="Перейти в магазин"
 *   actionHref="/shop"
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionColorPalette = 'fg',
  ...props
}: EmptyStateProps) {
  return (
    <VStack gap={6} py={12} textAlign="center" {...props}>
      <Box color="fg.muted">{icon}</Box>
      <Heading size="lg" color="fg">
        {title}
      </Heading>
      {description && <Text color="fg.muted">{description}</Text>}
      {actionLabel && actionHref && (
        <Button colorPalette={actionColorPalette} asChild>
          <LocalizedLink href={actionHref}>{actionLabel}</LocalizedLink>
        </Button>
      )}
    </VStack>
  )
}
