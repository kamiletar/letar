# Navigation

Мобильная навигация с Chakra UI v3.

## Mobile Drawer Menu

Основной паттерн мобильной навигации — боковая панель:

```tsx
// Файл: apps/imot/src/app/_components/navigation/mobile-menu.tsx
import {
  Avatar,
  Button,
  CloseButton,
  Drawer,
  HStack,
  IconButton,
  Portal,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { LuMenu } from 'react-icons/lu'

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root placement="start" size="xs" open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Drawer.Trigger asChild>
        <IconButton
          variant="ghost"
          aria-label="Открыть меню"
          display={{ base: 'flex', lg: 'none' }} // Только mobile
        >
          <LuMenu />
        </IconButton>
      </Drawer.Trigger>

      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            {/* Header с пользователем */}
            <Drawer.Header borderBottomWidth="1px">
              <HStack gap={3}>
                <Avatar name="Иван Иванов" size="sm" />
                <Text fontWeight="medium">Иван Иванов</Text>
              </HStack>
              <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
            </Drawer.Header>

            {/* Navigation links */}
            <Drawer.Body p={0}>
              <VStack align="stretch" gap={0}>
                <NavLink href="/dashboard" onClick={() => setOpen(false)}>
                  Главная
                </NavLink>
                <NavLink href="/profile" onClick={() => setOpen(false)}>
                  Профиль
                </NavLink>
                <NavLink href="/orders" onClick={() => setOpen(false)}>
                  Заказы
                </NavLink>

                <Separator />

                <NavLink href="/settings" onClick={() => setOpen(false)}>
                  Настройки
                </NavLink>
              </VStack>
            </Drawer.Body>

            {/* Footer с logout */}
            <Drawer.Footer borderTopWidth="1px">
              <Button variant="outline" w="full" onClick={handleLogout}>
                Выйти
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

// Компонент навигационной ссылки
function NavLink({ href, children, onClick }) {
  return (
    <Button
      asChild
      variant="ghost"
      justifyContent="flex-start"
      h="auto"
      py={3}
      px={4}
      borderRadius={0}
      onClick={onClick}
    >
      <Link href={href}>{children}</Link>
    </Button>
  )
}
```

---

## Header с adaptive navigation

```tsx
// Файл: apps/premium-rosstil/src/app/_components/header/header.tsx
import { Box, Flex, HStack, IconButton } from '@chakra-ui/react'
import Link from 'next/link'
import { LuMenu, LuPhone } from 'react-icons/lu'

export function Header() {
  return (
    <Box as="header" position="relative">
      {/* Мобильные кнопки — fixed позиция */}
      <IconButton
        position="fixed"
        zIndex={20}
        top={3}
        left={3}
        display={{ base: 'flex', md: 'none' }} // Только mobile
        aria-label="Открыть меню"
        variant="ghost"
        size="lg"
      >
        <LuMenu />
      </IconButton>

      <IconButton
        position="fixed"
        zIndex={20}
        top={3}
        right={3}
        display={{ base: 'flex', md: 'none' }} // Только mobile
        aria-label="Позвонить"
        variant="ghost"
        size="lg"
        asChild
      >
        <a href="tel:+79001234567">
          <LuPhone />
        </a>
      </IconButton>

      {/* Desktop навигация */}
      <Flex
        display={{ base: 'none', md: 'flex' }} // Только desktop
        justify="space-between"
        align="center"
        py={4}
        px={6}
      >
        <Logo />

        <HStack gap={6} as="nav">
          <Link href="/catalog">Каталог</Link>
          <Link href="/about">О нас</Link>
          <Link href="/contacts">Контакты</Link>
        </HStack>

        <HStack gap={4}>
          <CartButton />
          <UserMenu />
        </HStack>
      </Flex>
    </Box>
  )
}
```

---

## Bottom Navigation

Популярный паттерн для мобильных приложений:

```tsx
import { Box, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuHome, LuSearch, LuShoppingCart, LuUser } from 'react-icons/lu'

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <Box
      as="nav"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="bg"
      borderTopWidth="1px"
      display={{ base: 'block', md: 'none' }} // Только mobile
      zIndex="sticky"
      pb="env(safe-area-inset-bottom)" // iPhone notch
    >
      <HStack justify="space-around" py={2}>
        <NavItem href="/" icon={LuHome} label="Главная" active={pathname === '/'} />
        <NavItem href="/search" icon={LuSearch} label="Поиск" active={pathname === '/search'} />
        <NavItem href="/cart" icon={LuShoppingCart} label="Корзина" active={pathname === '/cart'} />
        <NavItem href="/profile" icon={LuUser} label="Профиль" active={pathname.startsWith('/profile')} />
      </HStack>
    </Box>
  )
}

function NavItem({ href, icon: Icon, label, active }) {
  return (
    <VStack as={Link} href={href} gap={0.5} color={active ? 'fg.500' : 'fg.muted'} minW="60px">
      <Icon size={24} />
      <Text fontSize="xs">{label}</Text>
    </VStack>
  )
}
```

### Учёт Bottom Navigation в layout

```tsx
// Добавь padding снизу для контента
<Box pb={{ base: '80px', md: 0 }}>
  {children}
</Box>
<BottomNavigation />
```

---

## Breadcrumbs (скрытие на mobile)

```tsx
// Файл: apps/imot/src/app/_components/navigation/app-header.tsx
<Breadcrumb.Root display={{ base: 'none', md: 'block' }}>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/">Главная</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.CurrentLink>Страница</Breadcrumb.CurrentLink>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb.Root>
```

---

## Tabs (scrollable на mobile)

```tsx
<Tabs.Root defaultValue="tab1">
  <Tabs.List overflowX="auto" flexWrap="nowrap">
    <Tabs.Trigger value="tab1">Описание</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Характеристики</Tabs.Trigger>
    <Tabs.Trigger value="tab3">Отзывы</Tabs.Trigger>
    <Tabs.Trigger value="tab4">Доставка</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="tab1">...</Tabs.Content>
</Tabs.Root>
```

---

## Back Button (mobile pattern)

```tsx
'use client'

import { IconButton } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'

export function BackButton() {
  const router = useRouter()

  return (
    <IconButton
      display={{ base: 'flex', md: 'none' }}
      variant="ghost"
      aria-label="Назад"
      onClick={() => router.back()}
    >
      <LuArrowLeft />
    </IconButton>
  )
}
```

---

## См. также

- [layouts.md](layouts.md) — Sidebar layout
- [touch-friendly.md](touch-friendly.md) — Touch targets для кнопок
