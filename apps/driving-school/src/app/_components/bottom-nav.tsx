'use client'

import { Box, Flex, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuCalendar, LuHouse, LuMessageSquare, LuSearch, LuSettings, LuUsers } from 'react-icons/lu'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  // Роуты, на которых этот таб считается активным (включая вложенные)
  activeRoutes?: string[]
}

// Навигация для ученика
const studentNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Главная', icon: LuHouse, activeRoutes: ['/dashboard'] },
  { href: '/my-schedule', label: 'Расписание', icon: LuCalendar, activeRoutes: ['/my-schedule', '/my-lessons'] },
  { href: '/chats', label: 'Чаты', icon: LuMessageSquare, activeRoutes: ['/chats'] },
  { href: '/instructors', label: 'Поиск', icon: LuSearch, activeRoutes: ['/instructors', '/schools'] },
  { href: '/profile', label: 'Профиль', icon: LuSettings, activeRoutes: ['/profile', '/settings', '/my-profile'] },
]

// Навигация для инструктора
const instructorNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Главная', icon: LuHouse, activeRoutes: ['/dashboard'] },
  {
    href: '/schedule',
    label: 'Расписание',
    icon: LuCalendar,
    activeRoutes: ['/schedule', '/lessons', '/lesson-types'],
  },
  { href: '/students', label: 'Ученики', icon: LuUsers, activeRoutes: ['/students'] },
  { href: '/chats', label: 'Чаты', icon: LuMessageSquare, activeRoutes: ['/chats'] },
  {
    href: '/profile',
    label: 'Профиль',
    icon: LuSettings,
    activeRoutes: ['/profile', '/settings', '/instructor-profile', '/vehicles'],
  },
]

interface BottomNavProps {
  roles?: string[]
}

/**
 * Нижняя панель навигации для мобильных устройств.
 * - Показывается только на мобильных (< md breakpoint)
 * - Адаптивна под роли пользователя (ученик/инструктор)
 * - Скрывается при скролле вниз, появляется при скролле вверх
 * - Touch-friendly с минимальным размером 44px
 */
export function BottomNav({ roles = [] }: BottomNavProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Определяем набор навигации по ролям
  const isInstructor = roles.includes('INSTRUCTOR') || roles.includes('FREELANCE_INSTRUCTOR')
  const navItems = isInstructor ? instructorNavItems : studentNavItems

  // Скрытие/показ при скролле
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Показываем, если скроллим вверх или в самом верху страницы
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Скрываем, если скроллим вниз и прокрутили достаточно
        setIsVisible(false)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Проверка активности таба
  const isActive = (item: NavItem) => {
    if (item.activeRoutes) {
      return item.activeRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))
    }
    return pathname === item.href
  }

  // Не показываем на некоторых страницах (лендинг, авторизация, онбординг)
  const hiddenRoutes = ['/', '/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/onboarding']
  if (
    hiddenRoutes.includes(pathname) ||
    pathname.startsWith('/join-instructor/') ||
    pathname.startsWith('/join-school/')
  ) {
    return null
  }

  return (
    <Box
      as="nav"
      data-testid="bottom-nav"
      aria-label="Мобильная навигация"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex="sticky"
      bg="bg.panel"
      borderTopWidth={1}
      borderColor="border"
      // Показываем только на мобильных
      display={{ base: 'block', md: 'none' }}
      // Анимация скрытия
      transform={isVisible ? 'translateY(0)' : 'translateY(100%)'}
      transition="transform 0.3s ease-in-out"
      // Безопасная область для устройств с вырезами (iPhone X+)
      pb="env(safe-area-inset-bottom)"
    >
      <Flex justify="space-around" align="center" py={1}>
        {navItems.map((item) => {
          const active = isActive(item)
          return (
            <Link key={item.href} href={item.href} style={{ flex: 1, textDecoration: 'none' }}>
              <VStack
                gap={0.5}
                py={2}
                // Минимальный тач-таргет 44px
                minH="44px"
                justify="center"
                color={active ? 'fg' : 'fg.muted'}
                // Подсветка активного таба
                position="relative"
                _before={
                  active
                    ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '24px',
                        height: '3px',
                        bg: 'fg',
                        borderRadius: 'full',
                      }
                    : undefined
                }
                // Активное состояние при нажатии
                _active={{
                  transform: 'scale(0.95)',
                }}
                transition="all 0.15s ease"
              >
                <Icon boxSize={5} color={active ? 'fg' : 'fg.muted'}>
                  <item.icon />
                </Icon>
                <Text fontSize="2xs" fontWeight={active ? 'semibold' : 'normal'}>
                  {item.label}
                </Text>
              </VStack>
            </Link>
          )
        })}
      </Flex>
    </Box>
  )
}
