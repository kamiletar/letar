'use client'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Button } from '@/app/_components/ui/button'
import { useSession } from '@/lib/auth-client'
import type { UserRole } from '@/lib/auth.types'
import {
  Badge,
  Box,
  CloseButton,
  Drawer,
  Flex,
  Icon,
  IconButton,
  Link as ChakraLink,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  LuActivity,
  LuAppWindow,
  LuBell,
  LuChartBar,
  LuClipboardList,
  LuClock,
  LuDatabase,
  LuGlobe,
  LuKeyRound,
  LuLayoutDashboard,
  LuMenu,
  LuPackage,
  LuRocket,
  LuServer,
  LuSettings,
} from 'react-icons/lu'
import { NotificationsPopover } from './NotificationsPopover'
import { ServerSelector } from './ServerSelector'

interface AlertsCount {
  active: number
}

async function fetchActiveAlertsCount(): Promise<AlertsCount> {
  const res = await fetch('/api/alerts?active=true')
  if (!res.ok) {
    return { active: 0 }
  }
  const data = await res.json()
  return { active: data.count || 0 }
}

const navLinks = [
  { href: '/', label: 'Обзор', icon: LuLayoutDashboard },
  { href: '/apps', label: 'Приложения', icon: LuAppWindow },
  { href: '/metrics', label: 'Метрики', icon: LuActivity },
  { href: '/docker/containers', label: 'Docker', icon: LuServer },
  { href: '/nginx', label: 'Nginx', icon: LuGlobe },
  { href: '/deploy', label: 'Деплой', icon: LuRocket },
  { href: '/database', label: 'База данных', icon: LuDatabase },
  { href: '/cron', label: 'Cron', icon: LuClock },
  { href: '/deps', label: 'Зависимости', icon: LuPackage },
  { href: '/alerts', label: 'Алерты', icon: LuBell, showBadge: true },
  { href: '/analytics', label: 'Аналитика', icon: LuChartBar },
  { href: '/audit-log', label: 'Аудит', icon: LuClipboardList },
  { href: '/servers', label: 'Серверы', icon: LuServer },
  { href: '/settings', label: 'Настройки', icon: LuSettings },
]

const SIDEBAR_W = '220px'

/**
 * Левый фиксированный сайдбар с навигацией
 * Desktop: всегда виден (fixed)
 * Mobile: скрыт, открывается как Drawer по кнопке
 */
export function Sidebar() {
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  // Хуки всегда вызываются до условных return (правило Rules of Hooks)
  const { data: alertsCount } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: fetchActiveAlertsCount,
    refetchInterval: 10000,
  })

  // Не показываем сайдбар на страницах аутентификации
  if (pathname.startsWith('/auth')) {
    return null
  }

  const user = session?.user as { id: string; name: string; role?: UserRole } | undefined

  const handleSignOut = () => {
    startTransition(() => logoutAction())
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const renderNavLink = (link: (typeof navLinks)[0], onClick?: () => void) => {
    const active = isActive(link.href)
    return (
      <ChakraLink key={link.href} asChild w="full" _hover={{ textDecoration: 'none' }} onClick={onClick}>
        <Link href={link.href}>
          <Flex
            align="center"
            gap={3}
            px={3}
            py={2}
            borderRadius="md"
            bg={active ? 'brand.subtle' : 'transparent'}
            color={active ? 'brand.fg' : 'fg.muted'}
            fontWeight={active ? 'semibold' : 'normal'}
            fontSize="sm"
            _hover={{ bg: active ? 'brand.subtle' : 'bg.subtle', color: 'fg' }}
            transitionProperty="background-color, color"
            transitionDuration="0.15s"
          >
            <Icon boxSize={4} flexShrink={0}>
              <link.icon />
            </Icon>
            <Text flex="1">{link.label}</Text>
            {link.showBadge && alertsCount && alertsCount.active > 0 && (
              <Badge colorPalette="red" size="sm" variant="solid" borderRadius="full" minW="5" textAlign="center">
                {alertsCount.active}
              </Badge>
            )}
          </Flex>
        </Link>
      </ChakraLink>
    )
  }

  const sidebarContent = (
    <Flex direction="column" h="full" overflow="hidden">
      {/* Логотип */}
      <Box px={4} py={4} borderBottomWidth="1px" borderColor="border.muted">
        <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
          <Link href="/">
            <Text fontSize="lg" fontWeight="bold" color="fg">
              Dashboard
            </Text>
          </Link>
        </ChakraLink>
        <Box mt={3}>
          <ServerSelector />
        </Box>
      </Box>

      {/* Навигация */}
      <VStack
        flex="1"
        align="stretch"
        gap={1}
        px={2}
        py={3}
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'var(--chakra-colors-border-muted)', borderRadius: '2px' },
        }}
      >
        {navLinks.map((link) => renderNavLink(link, () => setMobileOpen(false)))}
      </VStack>

      {/* Нижняя секция — пользователь */}
      {user && (
        <Box px={3} py={3} borderTopWidth="1px" borderColor="border.muted">
          <Flex align="center" gap={2} mb={2}>
            <NotificationsPopover />
            <ColorModeButton />
            <Badge colorPalette={user.role === 'ADMIN' ? 'red' : 'blue'} size="sm" flexShrink={0}>
              {user.role || 'VIEWER'}
            </Badge>
          </Flex>
          <Text fontSize="xs" color="fg.muted" mb={2} truncate title={user.name}>
            {user.name}
          </Text>
          <Button size="xs" variant="ghost" w="full" asChild>
            <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
              <LuKeyRound size={12} />
              Ключница
            </a>
          </Button>
          <Button size="xs" variant="ghost" colorPalette="red" w="full" onClick={handleSignOut}>
            Выйти
          </Button>
        </Box>
      )}
    </Flex>
  )

  return (
    <>
      {/* Desktop: фиксированный сайдбар */}
      <Box
        display={{ base: 'none', lg: 'flex' }}
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        w={SIDEBAR_W}
        bg="bg.muted"
        borderRightWidth="1px"
        borderColor="border.muted"
        flexDirection="column"
        zIndex={100}
      >
        {sidebarContent}
      </Box>

      {/* Mobile: верхняя полоска с кнопкой меню */}
      <Flex
        display={{ base: 'flex', lg: 'none' }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        h="56px"
        bg="bg.muted"
        borderBottomWidth="1px"
        borderColor="border.muted"
        align="center"
        px={4}
        justify="space-between"
        zIndex={100}
      >
        <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
          <Link href="/">
            <Text fontSize="md" fontWeight="bold" color="fg">
              Dashboard
            </Text>
          </Link>
        </ChakraLink>
        <Flex gap={2} align="center">
          <ColorModeButton />
          {user && <NotificationsPopover />}
          <IconButton aria-label="Открыть меню" variant="ghost" color="fg" onClick={() => setMobileOpen(true)}>
            <LuMenu size={22} />
          </IconButton>
        </Flex>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer.Root open={mobileOpen} onOpenChange={(e) => setMobileOpen(e.open)} placement="start">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content w={SIDEBAR_W} maxW={SIDEBAR_W}>
              <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" color="fg" />
              </Drawer.CloseTrigger>
              <Box h="full">{sidebarContent}</Box>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  )
}
