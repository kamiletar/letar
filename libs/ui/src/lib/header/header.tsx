'use client'

import { Flex, Spacer } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { HeaderActions } from './header-actions'
import { HeaderLogo } from './header-logo'
import { HeaderMobileActions, HeaderMobileMenu } from './header-mobile-menu'
import { HeaderNav } from './header-nav'
import { HeaderRoot, type HeaderRootProps } from './header-root'

export interface HeaderProps extends HeaderRootProps {
  /**
   * Контент хедера
   */
  children: ReactNode
}

/**
 * Compound component для построения Header
 *
 * Предоставляет гибкую структуру для создания адаптивных хедеров
 * с логотипом, навигацией, действиями и мобильным меню.
 *
 * @example
 * ```tsx
 * const navItems = [
 *   { href: '/', label: 'Главная', exact: true },
 *   { href: '/catalog', label: 'Каталог' },
 *   { href: '/about', label: 'О нас' },
 * ]
 *
 * <Header blurBackdrop sticky>
 *   <Header.Logo>My Brand</Header.Logo>
 *   <Header.Nav items={navItems} />
 *   <Spacer />
 *   <Header.Actions>
 *     <ThemeSwitcher />
 *     <CartButton />
 *     <UserMenu />
 *   </Header.Actions>
 *   <Header.MobileActions>
 *     <ThemeSwitcher />
 *     <Header.MobileMenu
 *       items={navItems}
 *       footerSlot={<UserInfo />}
 *     />
 *   </Header.MobileActions>
 * </Header>
 * ```
 */
function HeaderComponent({ children, ...rootProps }: HeaderProps) {
  return (
    <HeaderRoot {...rootProps}>
      <Flex align="center" gap={4}>
        {children}
      </Flex>
    </HeaderRoot>
  )
}

/**
 * Разделитель для выравнивания элементов
 */
function HeaderSpacer() {
  return <Spacer />
}

// Compound component
export const Header = Object.assign(HeaderComponent, {
  Root: HeaderRoot,
  Logo: HeaderLogo,
  Nav: HeaderNav,
  Actions: HeaderActions,
  MobileMenu: HeaderMobileMenu,
  MobileActions: HeaderMobileActions,
  Spacer: HeaderSpacer,
})
