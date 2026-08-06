'use client'

import type { BoxProps, ContainerProps } from '@chakra-ui/react'
import { Box, Container } from '@chakra-ui/react'
import { type ReactNode, useMemo } from 'react'
import { HeaderMobileProvider } from './header-context'

export interface HeaderRootProps extends Omit<BoxProps, 'children'> {
  children: ReactNode
  /**
   * Скрывать хедер при скролле вниз
   * @default false
   */
  hideOnScroll?: boolean
  /**
   * Применить blur эффект к фону
   * @default true
   */
  blurBackdrop?: boolean
  /**
   * Sticky позиционирование
   * @default true
   */
  sticky?: boolean
  /**
   * Props для внутреннего Container
   */
  containerProps?: ContainerProps
  /**
   * Показывать ли хедер (для анимации)
   * @default true
   */
  isVisible?: boolean
}

/**
 * Корневой компонент Header
 *
 * Оборачивает контент в sticky контейнер с blur эффектом.
 * Для анимации скрытия используйте hideOnScroll вместе с useScrollDirection хуком.
 *
 * @example
 * ```tsx
 * <Header.Root blurBackdrop sticky>
 *   <Header.Logo />
 *   <Header.Nav items={navItems} />
 *   <Header.Actions>
 *     <ThemeSwitcher />
 *   </Header.Actions>
 * </Header.Root>
 * ```
 */
export function HeaderRoot({
  children,
  hideOnScroll = false,
  blurBackdrop = true,
  sticky = true,
  containerProps,
  isVisible = true,
  ...boxProps
}: HeaderRootProps) {
  const stickyStyles = useMemo(
    () =>
      sticky
        ? {
          position: 'sticky' as const,
          top: 0,
          zIndex: 100,
        }
        : {},
    [sticky],
  )

  const blurStyles = useMemo(
    () =>
      blurBackdrop
        ? {
          backdropFilter: 'blur(10px)',
          bg: 'bg/80',
        }
        : {
          bg: 'bg',
        },
    [blurBackdrop],
  )

  const visibilityStyles = useMemo(
    () =>
      hideOnScroll
        ? {
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out',
        }
        : {},
    [hideOnScroll, isVisible],
  )

  return (
    <HeaderMobileProvider>
      <Box
        as="header"
        borderBottomWidth="1px"
        borderColor="border.subtle"
        py={3}
        {...stickyStyles}
        {...blurStyles}
        {...visibilityStyles}
        {...boxProps}
      >
        <Container maxW="container.xl" {...containerProps}>
          {children}
        </Container>
      </Box>
    </HeaderMobileProvider>
  )
}
