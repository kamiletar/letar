'use client'

import { Link as LocalizedLink, usePathname, useRouter } from '@/i18n/navigation'
import { signOut, useSession } from '@/lib/auth-client'
import { Button, CloseButton, Drawer, Flex, IconButton, Portal, Separator, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import NextLink from 'next/link'
import { useState } from 'react'
import { LuCircleHelp, LuLogIn, LuLogOut, LuMenu, LuSettings } from 'react-icons/lu'
import { useOnboarding } from './onboarding'

/** Ключи пунктов навигации */
const navItemKeys = [
  { href: '/', key: 'home' },
  { href: '/mandalas', key: 'gallery' },
  { href: '/shop', key: 'shop' },
  { href: '/about-elfafeya', key: 'aboutArtist' },
  { href: '/about-mandalas', key: 'aboutMandalas' },
  { href: '/contacts', key: 'contacts' },
] as const

export function MobileMenu() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { restart: restartOnboarding } = useOnboarding()
  const [open, setOpen] = useState(false)
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')

  const handleClose = () => setOpen(false)

  const handleSignOut = async () => {
    await signOut()
    handleClose()
    router.push('/')
    router.refresh()
  }

  return (
    <Drawer.Root placement="end" open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Drawer.Trigger asChild>
        <IconButton variant="ghost" aria-label={t('menuAria')}>
          <LuMenu size={24} />
        </IconButton>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={{ _light: 'white', _dark: 'gray.900' }}>
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Drawer.Title color="fg">{t('menu')}</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body py={4}>
              <VStack gap={2} align="stretch">
                {navItemKeys.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <LocalizedLink key={item.href} href={item.href} onClick={handleClose}>
                      <Flex
                        py={3}
                        px={4}
                        borderRadius="md"
                        bg={isActive ? 'bg.hover' : 'transparent'}
                        _hover={{ bg: 'bg.hover' }}
                        transition="all 0.2s"
                      >
                        <Text
                          fontSize="lg"
                          fontWeight={isActive ? 'bold' : 'normal'}
                          color={isActive ? 'fg.brand' : 'fg'}
                        >
                          {t(item.key)}
                        </Text>
                      </Flex>
                    </LocalizedLink>
                  )
                })}
              </VStack>

              <Separator my={4} borderColor="border.subtle" />

              <VStack gap={2} align="stretch">
                <Button
                  variant="ghost"
                  colorPalette="gray"
                  w="full"
                  justifyContent="flex-start"
                  onClick={() => {
                    handleClose()
                    restartOnboarding()
                  }}
                >
                  <LuCircleHelp />
                  {t('help')}
                </Button>

                {session
                  ? (
                    <>
                      {session.user?.role === 'ADMIN' && (
                        <NextLink href="/admin" onClick={handleClose}>
                          <Button variant="ghost" colorPalette="gray" w="full" justifyContent="flex-start">
                            <LuSettings />
                            {t('admin')}
                          </Button>
                        </NextLink>
                      )}
                      <Button
                        variant="ghost"
                        colorPalette="gray"
                        w="full"
                        justifyContent="flex-start"
                        onClick={handleSignOut}
                      >
                        <LuLogOut />
                        {tAuth('signOut')}
                      </Button>
                    </>
                  )
                  : (
                    <LocalizedLink href="/sign-in" onClick={handleClose}>
                      <Button variant="solid" colorPalette="purple" w="full">
                        <LuLogIn />
                        {tAuth('signIn')}
                      </Button>
                    </LocalizedLink>
                  )}
              </VStack>
            </Drawer.Body>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="md" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
