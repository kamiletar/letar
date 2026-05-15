'use client'

import type { StackProps } from '@chakra-ui/react'
import { HStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface HeaderActionsProps extends Omit<StackProps, 'children'> {
  children: ReactNode
}

/**
 * Контейнер для действий в правой части Header
 *
 * Содержит кнопки: тема, корзина, уведомления, профиль и т.д.
 *
 * @example
 * ```tsx
 * <Header.Actions>
 *   <ThemeSwitcher />
 *   <CartButton />
 *   <UserMenu />
 * </Header.Actions>
 * ```
 */
export function HeaderActions({ children, ...stackProps }: HeaderActionsProps) {
  return (
    <HStack gap={2} display={{ base: 'none', md: 'flex' }} {...stackProps}>
      {children}
    </HStack>
  )
}
