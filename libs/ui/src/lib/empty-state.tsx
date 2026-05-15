'use client'

import { Button, EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { forwardRef } from 'react'
import { LuInbox } from 'react-icons/lu'

export interface AppEmptyStateProps extends ChakraEmptyState.RootProps {
  /** Заголовок пустого состояния */
  title: string
  /** Описание пустого состояния */
  description?: string
  /** Иконка (по умолчанию LuInbox) */
  icon?: ReactNode
  /** Текст кнопки действия */
  actionLabel?: string
  /** URL для кнопки действия (если указан, кнопка оборачивается в <a>) */
  actionHref?: string
  /** Обработчик клика на кнопку действия */
  onAction?: () => void
}

/**
 * Компонент пустого состояния для списков и результатов поиска
 *
 * @example
 * ```tsx
 * <AppEmptyState
 *   title="Нет записей"
 *   description="Добавьте первую запись"
 *   actionLabel="Добавить"
 *   onAction={() => setShowModal(true)}
 * />
 * ```
 */
export const AppEmptyState = forwardRef<HTMLDivElement, AppEmptyStateProps>(function AppEmptyState(
  { title, description, icon = <LuInbox />, actionLabel, actionHref, onAction, children, ...rest },
  ref
) {
  return (
    <ChakraEmptyState.Root ref={ref} {...rest}>
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator>{icon}</ChakraEmptyState.Indicator>

        <VStack textAlign="center" gap={1}>
          <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
          {description && <ChakraEmptyState.Description>{description}</ChakraEmptyState.Description>}
        </VStack>

        {/* Кнопка действия */}
        {actionLabel && (actionHref || onAction) && (
          <>
            {actionHref ? (
              <Button asChild colorPalette="brand">
                <a href={actionHref}>{actionLabel}</a>
              </Button>
            ) : (
              <Button colorPalette="brand" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </>
        )}

        {/* Дополнительный контент */}
        {children}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  )
})
