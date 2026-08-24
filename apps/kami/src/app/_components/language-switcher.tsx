'use client'

import { type Locale, routing } from '@/i18n/routing'
import { Button, Menu, Portal } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
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
  const rawPathname = pathname.replace(`/${locale}`, '') || '/'
  // next.config.js: trailingSlash: true — но next-intl's <Link> сам не проходит через серверную
  // нормализацию, а его внутренний prefixPathname() ЯВНО обрезает слэш при префиксации корня
  // ("/" + "/en" → "/en", не "/en/") — наш собственный trailing-slash здесь бесполезен, баг живёт
  // внутри next-intl. Поэтому строим href вручную и рендерим plain next/link, минуя эту логику.
  // localeCookie next-intl тут не нужен: routing.ts уже отключил localeDetection, cookie ни на
  // что не влияет.
  const pathnameWithoutLocale = rawPathname.endsWith('/') ? rawPathname : `${rawPathname}/`
  const hrefFor = (
    loc: Locale,
  ) => (loc === routing.defaultLocale ? pathnameWithoutLocale : `/${loc}${pathnameWithoutLocale}`)

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
                <Link href={hrefFor(loc)}>
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
