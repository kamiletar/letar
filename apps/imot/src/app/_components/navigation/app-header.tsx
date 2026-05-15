import { ImotLogo } from '@/app/_components/imot-logo'
import { ColorModeButton } from '@/app/_components/ui/color-mode'
import type { UserRole } from '@/generated/prisma'
import { Box, Container, Flex, HStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import type { BreadcrumbItem } from './breadcrumbs'
import { Breadcrumbs } from './breadcrumbs'
import { MobileMenu } from './mobile-menu'
import { UserMenu } from './user-menu'

interface AppHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role: UserRole
  }
  /** Показывать ли breadcrumbs */
  showBreadcrumbs?: boolean
  /** Кастомные breadcrumbs items */
  breadcrumbItems?: BreadcrumbItem[]
  /** Quick Actions компонент (для SPECIALIST) */
  quickActions?: React.ReactNode
}

/**
 * Главный Header приложения
 * Отображается на всех защищенных страницах
 *
 * Содержит:
 * - Logo (слева, ссылка на /dashboard)
 * - Breadcrumbs (опционально)
 * - Quick Actions (опционально, для SPECIALIST)
 * - ColorModeButton
 * - UserMenu
 * - MobileMenu toggle (мобильные)
 *
 * Responsive дизайн:
 * - Desktop: полный функционал
 * - Mobile: упрощенная версия с drawer menu
 */
export function AppHeader({ user, showBreadcrumbs = true, breadcrumbItems, quickActions }: AppHeaderProps) {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
      h="64px"
    >
      <Container maxW="full" h="full" px={{ base: 4, md: 6 }}>
        <Flex justify="space-between" align="center" h="full">
          {/* Left section: Mobile Menu + Logo + Breadcrumbs */}
          <HStack gap={4}>
            {/* Mobile Menu Toggle */}
            <MobileMenu user={user} />

            {/* Logo */}
            <Box asChild cursor="pointer">
              <NextLink href="/dashboard">
                <ImotLogo size="sm" animated={false} />
              </NextLink>
            </Box>

            {/* Breadcrumbs (скрыты на мобильных) */}
            {showBreadcrumbs && (
              <Box display={{ base: 'none', md: 'block' }}>
                <Breadcrumbs items={breadcrumbItems} />
              </Box>
            )}
          </HStack>

          {/* Center section: Quick Actions (optional) */}
          {quickActions && <Box display={{ base: 'none', lg: 'block' }}>{quickActions}</Box>}

          {/* Right section: ColorMode + UserMenu */}
          <HStack gap={2}>
            <ColorModeButton />
            <UserMenu user={user} />
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}

// Экспорт типа для использования в других компонентах
export type { BreadcrumbItem }
