'use client'

import { Button, EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuBox, LuHistory, LuPrinter, LuScanLine, LuTag } from 'react-icons/lu'

/**
 * Типы пустых состояний для разных страниц
 */
export type EmptyStateType = 'history' | 'products' | 'batch' | 'stats' | 'scan'

/**
 * Конфигурация для каждого типа пустого состояния
 */
const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: ReactNode
    title: string
    description: string
  }
> = {
  history: {
    icon: <LuHistory />,
    title: 'История пуста',
    description: 'Здесь появятся напечатанные этикетки',
  },
  products: {
    icon: <LuBox />,
    title: 'Нет товаров',
    description: 'Добавьте товары для быстрого поиска по GTIN',
  },
  batch: {
    icon: <LuScanLine />,
    title: 'Нет кодов для печати',
    description: 'Загрузите файл CSV или TXT с кодами маркировки',
  },
  stats: {
    icon: <LuTag />,
    title: 'Нет статистики',
    description: 'Напечатайте этикетки чтобы увидеть статистику',
  },
  scan: {
    icon: <LuPrinter />,
    title: 'Ожидание сканирования',
    description: 'Отсканируйте код маркировки или введите вручную',
  },
}

interface AppEmptyStateProps {
  type: EmptyStateType
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Универсальный компонент пустого состояния
 */
export function AppEmptyState({ type, action }: AppEmptyStateProps) {
  const config = emptyStateConfig[type]

  return (
    <ChakraEmptyState.Root>
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator>{config.icon}</ChakraEmptyState.Indicator>
        <VStack textAlign="center">
          <ChakraEmptyState.Title>{config.title}</ChakraEmptyState.Title>
          <ChakraEmptyState.Description>{config.description}</ChakraEmptyState.Description>
        </VStack>
        {action && (
          <Button onClick={action.onClick} colorPalette="blue">
            {action.label}
          </Button>
        )}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  )
}
