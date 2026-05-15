'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { Box, Button, CloseButton, Drawer, Icon, IconButton, Portal, VStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { LuMenu } from 'react-icons/lu'
import { LanguageSwitcher } from './language-switcher'

type NavItem = {
  href: string
  labelKey: 'about' | 'skills' | 'projects' | 'blog' | 'consulting'
}

const navItems: NavItem[] = [
  { href: '/about', labelKey: 'about' },
  { href: '/skills', labelKey: 'skills' },
  { href: '/projects', labelKey: 'projects' },
  { href: '/blog', labelKey: 'blog' },
  { href: '/consulting', labelKey: 'consulting' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('nav')
  const pathname = usePathname()

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Drawer.Root size="xs" open={open} placement="start" onOpenChange={(e) => setOpen(e.open)}>
      <Drawer.Trigger asChild>
        <IconButton data-testid="mobile-menu-button" variant="ghost" aria-label={t('menuAria')}>
          <Icon size="lg">
            <LuMenu />
          </Icon>
        </IconButton>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content data-testid="mobile-menu">
            <Drawer.Header p={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <LanguageSwitcher />
                <ColorModeButton />
              </Box>
              <Drawer.Title display="none">{t('menuAria')}</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body display="flex" flexDirection="column" p={4}>
              <VStack as="nav" role="navigation" aria-label={t('mobileNavAria')} alignItems="stretch" gap={2}>
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      justifyContent="flex-start"
                      size="lg"
                      width="100%"
                      {...(isActive && {
                        bg: { base: 'green.50', _dark: 'green.900/40' },
                        color: { base: 'green.700', _dark: 'green.300' },
                        fontWeight: 'semibold',
                      })}
                    >
                      <Link href={item.href} onClick={closeMenu}>
                        {t(item.labelKey)}
                      </Link>
                    </Button>
                  )
                })}
              </VStack>
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
