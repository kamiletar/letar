'use client'

import { Box, CloseButton, Drawer, IconButton, Portal, Text, VStack } from '@chakra-ui/react'
import {
  BookOpen,
  Briefcase,
  Calendar,
  Code,
  FileBox,
  FileText,
  FolderKanban,
  ImageIcon,
  LayoutDashboard,
  Menu,
  Music,
  Share2,
  Star,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface AdminSidebarProps {
  locale: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

/** Генерирует навигационные элементы админ-панели */
function getNavItems(locale: string): NavItem[] {
  return [
    { href: `/${locale}/admin`, label: 'Дашборд', icon: <LayoutDashboard size={20} /> },
    { href: `/${locale}/admin/requests`, label: 'Заявки', icon: <Briefcase size={20} /> },
    { href: `/${locale}/admin/slots`, label: 'Слоты', icon: <Calendar size={20} /> },
    { href: `/${locale}/admin/testimonials`, label: 'Отзывы', icon: <Star size={20} /> },
    { href: `/${locale}/admin/cases`, label: 'Кейсы', icon: <Briefcase size={20} /> },
    { href: `/${locale}/admin/learning`, label: 'Изучаю', icon: <BookOpen size={20} /> },
    { href: `/${locale}/admin/skills`, label: 'Навыки', icon: <Code size={20} /> },
    { href: `/${locale}/admin/projects`, label: 'Проекты', icon: <FolderKanban size={20} /> },
    { href: `/${locale}/admin/images`, label: 'Изображения', icon: <ImageIcon size={20} /> },
    { href: `/${locale}/admin/audio`, label: 'Аудио', icon: <Music size={20} /> },
    { href: `/${locale}/admin/files`, label: 'Файлы', icon: <FileBox size={20} /> },
    { href: `/${locale}/admin/social`, label: 'Соцсети', icon: <Share2 size={20} /> },
    { href: `/${locale}/admin/users`, label: 'Пользователи', icon: <Users size={20} /> },
    { href: '/keystatic/', label: 'Блог (CMS)', icon: <FileText size={20} /> },
  ]
}

/** Список навигации (переиспользуется в sidebar и drawer) */
function NavList({
  navItems,
  pathname,
  onItemClick,
}: {
  navItems: NavItem[]
  pathname: string
  onItemClick?: () => void
}) {
  return (
    <VStack gap={1} align="stretch">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} onClick={onItemClick}>
            <Box
              display="flex"
              alignItems="center"
              gap={3}
              px={3}
              py={2}
              borderRadius="md"
              bg={isActive ? { base: 'fg.50', _dark: 'fg.950/30' } : 'transparent'}
              color={isActive ? 'fg' : 'fg.muted'}
              fontWeight={isActive ? 'semibold' : 'normal'}
              _hover={{
                bg: isActive ? undefined : 'bg.subtle',
              }}
              transitionProperty="background-color"
              transitionDuration="0.2s"
            >
              {item.icon}
              <Text fontSize="sm">{item.label}</Text>
            </Box>
          </Link>
        )
      })}
    </VStack>
  )
}

/**
 * Сайдбар админ-панели (desktop)
 */
export function AdminSidebar({ locale }: AdminSidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(locale)

  return (
    <Box
      as="nav"
      w="240px"
      bg="bg.panel"
      borderRightWidth="1px"
      borderColor="border"
      py={6}
      px={4}
      display={{ base: 'none', lg: 'block' }}
    >
      <NavList navItems={navItems} pathname={pathname} />
    </Box>
  )
}

/**
 * Мобильная навигация админ-панели (hamburger + Drawer)
 */
export function AdminMobileNav({ locale }: AdminSidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(locale)
  const [open, setOpen] = useState(false)

  return (
    <Box display={{ base: 'block', lg: 'none' }} position="fixed" top={3} left={3} zIndex="overlay">
      <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="start">
        <Drawer.Trigger asChild>
          <IconButton aria-label="Открыть меню" variant="outline" size="sm" bg="bg.panel" shadow="md">
            <Menu size={20} />
          </IconButton>
        </Drawer.Trigger>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Админ-панель</Drawer.Title>
                <Drawer.CloseTrigger asChild position="absolute" top="2" insetEnd="2">
                  <CloseButton size="sm" />
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body px={2}>
                <NavList navItems={navItems} pathname={pathname} onItemClick={() => setOpen(false)} />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Box>
  )
}
