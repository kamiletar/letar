'use client'

import { AppLink } from '@/app/_components/ui/app-link'
import { usePathname } from '@/i18n/navigation'
import { getPublicNavigation } from '@/lib/public-navigation'
import { useLocale, useTranslations } from 'next-intl'

export function NavLinks() {
  const t = useTranslations('nav')
  const navItems = getPublicNavigation(useLocale())
  const pathname = usePathname()

  return (
    <>
      {navItems.map((item) => {
        const isActive = !item.href.includes('#') && !item.href.startsWith('http')
          && pathname.replace(/\/$/, '') === item.href.replace(/\/$/, '')
        return (
          <AppLink
            key={item.href}
            href={item.href}
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
            {t(item.key)}
          </AppLink>
        )
      })}
    </>
  )
}
