'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { Button } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

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

export function NavLinks() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            size="sm"
            minH="44px"
            {...(isActive && {
              bg: { base: 'green.50', _dark: 'green.900/40' },
              color: { base: 'green.700', _dark: 'green.300' },
              fontWeight: 'semibold',
            })}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'fg.500',
              outlineOffset: '2px',
            }}
          >
            <Link href={item.href}>{t(item.labelKey)}</Link>
          </Button>
        )
      })}
    </>
  )
}
