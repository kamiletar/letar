'use client'

import { Box, Flex, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LuBuilding2,
  LuChartNoAxesCombined,
  LuClipboardCheck,
  LuHeart,
  LuHouse,
  LuMapPin,
  LuNewspaper,
  LuSend,
  LuSettings,
  LuShieldAlert,
  LuShieldCheck,
  LuSwords,
  LuTrophy,
  LuUserRound,
  LuUsers,
} from 'react-icons/lu'

export interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

export const navItems: NavItem[] = [
  { href: '/admin', label: 'Дашборд', icon: LuHouse },
  { href: '/admin/cities', label: 'Города', icon: LuBuilding2 },
  { href: '/admin/venues', label: 'Площадки', icon: LuMapPin },
  { href: '/admin/seasons', label: 'Сезоны', icon: LuTrophy },
  { href: '/admin/teams', label: 'Команды', icon: LuUsers },
  { href: '/admin/players', label: 'Поэты', icon: LuUserRound },
  { href: '/admin/users', label: 'Пользователи', icon: LuShieldCheck },
  { href: '/admin/moderation', label: 'Заявки', icon: LuClipboardCheck },
  { href: '/admin/matches', label: 'Матчи', icon: LuSwords },
  { href: '/admin/suspensions', label: 'Дисциплина', icon: LuShieldAlert },
  { href: '/admin/news', label: 'Новости', icon: LuNewspaper },
  { href: '/admin/donate', label: 'Донаты', icon: LuHeart },
  { href: '/admin/analytics', label: 'Аналитика', icon: LuChartNoAxesCombined },
  { href: '/admin/telegram', label: 'Telegram', icon: LuSend },
  { href: '/admin/settings', label: 'Настройки', icon: LuSettings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Box
      as="nav"
      w="240px"
      minH="100vh"
      bg="bg.panel"
      borderRightWidth="1px"
      borderColor="border.muted"
      py={4}
      px={2}
      flexShrink={0}
      display={{ base: 'none', md: 'block' }}
    >
      {/* Логотип */}
      <Flex px={3} py={2} mb={4} align="center" gap={2}>
        <Text fontWeight="bold" fontSize="lg" color="brand.fg">
          КБС
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Админ
        </Text>
      </Flex>

      {/* Навигация */}
      <VStack gap={1} align="stretch">
        {navItems.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <Flex
                align="center"
                gap={3}
                px={3}
                py={2}
                borderRadius="md"
                bg={isActive ? 'brand.subtle' : 'transparent'}
                color={isActive ? 'brand.fg' : 'fg.muted'}
                fontWeight={isActive ? 'semibold' : 'normal'}
                _hover={{ bg: isActive ? 'brand.subtle' : 'bg.subtle' }}
                transitionProperty="background-color, color"
                transitionDuration="0.15s"
              >
                <Icon as={item.icon} boxSize={5} />
                <Text fontSize="sm">{item.label}</Text>
              </Flex>
            </Link>
          )
        })}
      </VStack>
    </Box>
  )
}
