'use client'

import { Box, Heading, HStack, type StackProps, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** Пропсы компонента PageHeader */
export interface PageHeaderProps extends Omit<StackProps, 'title'> {
  /** Заголовок страницы */
  title: string
  /** Описание страницы (опционально) */
  description?: string
  /** Действия справа (кнопки, ссылки) */
  actions?: ReactNode
}

/**
 * Универсальный заголовок страницы
 * Устраняет дублирование header-паттерна на страницах
 *
 * @example
 * <PageHeader
 *   title="База товаров"
 *   description="Управление справочником товаров по GTIN"
 *   actions={
 *     <Button onClick={() => setIsCreateOpen(true)}>
 *       <LuPlus /> Добавить
 *     </Button>
 *   }
 * />
 */
export function PageHeader({ title, description, actions, ...boxProps }: PageHeaderProps) {
  return (
    <HStack justify="space-between" {...boxProps}>
      <Box>
        <Heading size="2xl" mb={description ? 2 : 0}>
          {title}
        </Heading>
        {description && <Text color="fg.muted">{description}</Text>}
      </Box>
      {actions && <HStack gap={2}>{actions}</HStack>}
    </HStack>
  )
}
