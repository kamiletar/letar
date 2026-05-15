'use client'

import { Link } from '@/i18n/navigation'
import { type Locale, routing } from '@/i18n/routing'
import { Button, Menu, Portal } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { LuGlobe } from 'react-icons/lu'

const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
}

const localeFlags: Record<Locale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
}

export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale() as Locale
  const pathname = usePathname()

  // Убираем текущую локаль из пути
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/'

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label={t(locale)}>
          <LuGlobe />
          <span>{localeFlags[locale]}</span>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {routing.locales.map((loc) => (
              <Menu.Item key={loc} value={loc} asChild>
                <Link href={pathnameWithoutLocale} locale={loc}>
                  {localeFlags[loc]} {localeNames[loc]}
                </Link>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
