'use client'

import { Box, CloseButton, Drawer, Flex, HStack, IconButton, Separator, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuMenu } from 'react-icons/lu'
import { useHeaderMobile } from './header-context'
import { HeaderNav, type NavItem } from './header-nav'

export interface HeaderMobileMenuProps {
  /**
   * Навигационные элементы
   */
  items?: NavItem[]
  /**
   * Контент в header drawer'а (рядом с кнопкой закрытия)
   */
  headerSlot?: ReactNode
  /**
   * Контент в footer drawer'а
   */
  footerSlot?: ReactNode
  /**
   * Дополнительный контент после навигации
   */
  children?: ReactNode
  /**
   * Цветовая схема
   * @default 'blue'
   */
  colorPalette?: string
}

/**
 * Мобильное меню (Drawer)
 *
 * Включает кнопку-гамбургер и выдвижную панель.
 *
 * @example
 * ```tsx
 * <Header.MobileMenu
 *   items={navItems}
 *   headerSlot={<ThemeSwitcher />}
 *   footerSlot={<UserInfo />}
 * >
 *   <CartLink />
 * </Header.MobileMenu>
 * ```
 */
export function HeaderMobileMenu({
  items = [],
  headerSlot,
  footerSlot,
  children,
  colorPalette = 'blue',
}: HeaderMobileMenuProps) {
  const { isOpen, open, close } = useHeaderMobile()

  return (
    <>
      {/* Кнопка открытия (только mobile) */}
      <IconButton
        aria-label="Открыть меню"
        variant="ghost"
        size="sm"
        display={{ base: 'flex', md: 'none' }}
        onClick={open}
      >
        <LuMenu />
      </IconButton>

      {/* Drawer */}
      <Drawer.Root open={isOpen} onOpenChange={(e) => !e.open && close()} placement="start">
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            {/* Header */}
            <Drawer.Header borderBottomWidth="1px">
              <HStack justify="space-between" width="full">
                <Drawer.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Drawer.CloseTrigger>
                {headerSlot}
              </HStack>
            </Drawer.Header>

            {/* Body */}
            <Drawer.Body py={4}>
              <VStack gap={4} align="stretch">
                {/* Навигация */}
                {items.length > 0 && <HeaderNav items={items} mode="mobile" colorPalette={colorPalette} />}

                {/* Дополнительный контент */}
                {children && (
                  <>
                    <Separator />
                    <Box>{children}</Box>
                  </>
                )}
              </VStack>
            </Drawer.Body>

            {/* Footer */}
            {footerSlot && (
              <Drawer.Footer borderTopWidth="1px" mt="auto">
                <Box width="full">{footerSlot}</Box>
              </Drawer.Footer>
            )}
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  )
}

/**
 * Обёртка для действий в мобильном режиме
 * Показывает элементы только на mobile
 */
export function HeaderMobileActions({ children }: { children: ReactNode }) {
  return (
    <Flex gap={2} display={{ base: 'flex', md: 'none' }} alignItems="center">
      {children}
    </Flex>
  )
}
