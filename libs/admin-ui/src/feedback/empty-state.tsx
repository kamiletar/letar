import { Button, Link, Text, VStack } from '@chakra-ui/react'
import type { IconType } from 'react-icons'
import { LuPlus } from 'react-icons/lu'

interface EmptyStateProps {
  /** Иконка для отображения */
  icon: IconType
  /** Заголовок */
  title: string
  /** Описание */
  description: string
  /** Кнопка действия */
  action?: {
    label: string
    href: string
  }
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Компонент для отображения пустого состояния списка
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={LuPackage}
 *   title="Нет товаров"
 *   description="Создайте первый товар"
 *   action={{ label: 'Создать товар', href: '/admin/products/new' }}
 * />
 * ```
 */
export function EmptyState({ icon: Icon, title, description, action, colorPalette = 'purple' }: EmptyStateProps) {
  return (
    <VStack py={12} gap={4} color="fg.muted">
      <Icon size={48} />
      <VStack gap={1}>
        <Text fontWeight="medium" fontSize="lg">
          {title}
        </Text>
        <Text fontSize="sm">{description}</Text>
      </VStack>
      {action && (
        <Button colorPalette={colorPalette} variant="outline" asChild>
          <Link href={action.href}>
            <LuPlus />
            {action.label}
          </Link>
        </Button>
      )}
    </VStack>
  )
}
