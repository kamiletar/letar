'use client'

import { Button, HStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'

/**
 * Переключатель языка RU/EN
 */
export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <HStack gap={1}>
      <Button
        size="xs"
        variant={locale === 'ru' ? 'solid' : 'ghost'}
        onClick={() => switchLocale('ru')}
        fontWeight={locale === 'ru' ? 'bold' : 'normal'}
      >
        RU
      </Button>
      <Button
        size="xs"
        variant={locale === 'en' ? 'solid' : 'ghost'}
        onClick={() => switchLocale('en')}
        fontWeight={locale === 'en' ? 'bold' : 'normal'}
      >
        EN
      </Button>
    </HStack>
  )
}
