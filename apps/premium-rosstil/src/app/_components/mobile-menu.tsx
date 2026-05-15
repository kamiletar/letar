'use client'

import { profileNavItems } from '@/app/[locale]/profile/_components/profile-nav-items'
import { logoutAction } from '@/app/_actions/auth.actions'
import { NavLink } from '@/app/_components/nav-link'
import { NavLinks } from '@/app/_components/nav-links'
import { useSession } from '@/lib/auth-client'
import {
  Avatar,
  Box,
  Button,
  CloseButton,
  Drawer,
  Flex,
  HStack,
  Icon,
  IconButton,
  Portal,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { useCallback, useState } from 'react'
import { MdAdminPanelSettings, MdLogin, MdLogout, MdOutlineMenu, MdShoppingCart } from 'react-icons/md'
import { OnlyFor } from './only-for'

export const MobileMenu = () => {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <Drawer.Root size={'xs'} open={open} placement={'start'} onOpenChange={(e) => setOpen(e.open)}>
      <Drawer.Trigger asChild>
        <IconButton
          data-testid="mobile-menu-button"
          rounded={'full'}
          variant={'subtle'}
          color={'fg'}
          aria-label="Открыть меню"
        >
          <Icon size={'xl'}>
            <MdOutlineMenu />
          </Icon>
        </IconButton>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content data-testid="mobile-menu">
            <Drawer.Header p={2}>
              <HStack justify="flex-end">
                <ColorModeButton />
              </HStack>
              <Drawer.Title display="none">Меню</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body display="flex" flexDirection="column" p={0}>
              {/* Scrollable menu items */}
              <VStack fontSize={'lg'} alignItems={'stretch'} gap={1} flex={1} overflowY="auto" px={4} py={2}>
                <NavLinks closeMenu={closeMenu} />

                <OnlyFor userRole={['USER', 'ADMIN']}>
                  <Separator my={3} />

                  {/* Cart - main item with icon */}
                  <Button asChild variant="ghost" justifyContent="flex-start" size="lg" width="100%">
                    <NavLink href={'/cart'} onClick={closeMenu}>
                      <Box as="span" mr={2}>
                        <MdShoppingCart />
                      </Box>
                      Корзина
                    </NavLink>
                  </Button>

                  <Separator my={3} />

                  {/* Profile submenu items */}
                  <VStack alignItems={'stretch'} gap={0} width="100%" fontSize={'md'} mb={3} px={2}>
                    {profileNavItems
                      .filter((item) => item.href !== '/cart' && item.href !== '/profile')
                      .map((item) => (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          onClick={closeMenu}
                          color={'fg.muted'}
                          _hover={{ color: 'fg', bg: 'bg.muted' }}
                          minH={'44px'}
                          display={'flex'}
                          alignItems={'center'}
                          px={3}
                          borderRadius={'sm'}
                        >
                          <Box as="span" mr={2} fontSize={'sm'}>
                            {item.icon}
                          </Box>
                          {item.label}
                        </NavLink>
                      ))}
                  </VStack>

                  <OnlyFor userRole="ADMIN">
                    <Separator my={2} />
                    <Button asChild variant="ghost" justifyContent="flex-start" size="lg" width="100%">
                      <NavLink href={'/admin'} onClick={closeMenu}>
                        <Box as="span" mr={2}>
                          <MdAdminPanelSettings />
                        </Box>
                        Админка
                      </NavLink>
                    </Button>
                  </OnlyFor>
                </OnlyFor>
              </VStack>

              {/* User info and logout - pinned to bottom (for authorized users) */}
              <OnlyFor userRole={['USER', 'ADMIN']}>
                <Box borderTop={'1px solid'} borderColor={'border.subtle'} bg={'bg.subtle'} p={4}>
                  {/* User info - Clickable */}
                  <NavLink
                    href={'/profile'}
                    onClick={closeMenu}
                    _hover={{ textDecoration: 'none', bg: 'bg.muted' }}
                    display={'block'}
                    borderRadius={'md'}
                    mb={2}
                    p={2}
                    mx={-2}
                  >
                    <Flex alignItems={'center'} gap={3}>
                      <Avatar.Root size={'md'}>
                        <Avatar.Fallback name={session?.user?.name ?? undefined} />
                        <Avatar.Image src={session?.user?.image ?? undefined} />
                      </Avatar.Root>
                      <Box flex={1} minW={0}>
                        <Text fontWeight={'semibold'} fontSize={'md'} truncate>
                          {session?.user?.name || 'Пользователь'}
                        </Text>
                        <Text fontSize={'sm'} color={'fg.muted'} truncate>
                          {session?.user?.email}
                        </Text>
                      </Box>
                    </Flex>
                  </NavLink>

                  {/* Logout button */}
                  <form action={logoutAction}>
                    <Button
                      type="submit"
                      variant="ghost"
                      color={'red.500'}
                      _hover={{ color: 'red.600', bg: 'red.50' }}
                      minH={'48px'}
                      w="full"
                      justifyContent={'center'}
                      borderRadius={'md'}
                      fontWeight={'medium'}
                      gap={2}
                    >
                      <MdLogout />
                      Выйти
                    </Button>
                  </form>
                </Box>
              </OnlyFor>

              {/* Login button - pinned to bottom (for guests) */}
              <OnlyFor userRole="UNAUTHORIZED">
                <Box borderTop={'1px solid'} borderColor={'border.subtle'} bg={'bg.subtle'} p={4}>
                  <Button asChild colorPalette="fg" size="lg" width="100%">
                    <NavLink href={'/auth/signin'} onClick={closeMenu}>
                      <Box as="span" mr={2}>
                        <MdLogin />
                      </Box>
                      Войти
                    </NavLink>
                  </Button>
                </Box>
              </OnlyFor>
            </Drawer.Body>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
