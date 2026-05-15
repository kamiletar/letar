'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import { LuGlobe } from 'react-icons/lu'

/**
 * Переключатель языка для навигации.
 * Позволяет переключаться между русским и английским языками.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = (newLocale: 'ru' | 'en') => {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- params типизация
        { pathname, params },
        { locale: newLocale }
      )
    })
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton variant="ghost" size="sm" aria-label={t('selectLanguage')} loading={isPending}>
          <LuGlobe size={20} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="140px">
            <Menu.Item value="ru" onClick={() => handleLocaleChange('ru')} color={locale === 'ru' ? 'fg.brand' : 'fg'}>
              <Text>🇷🇺 {t('ru')}</Text>
            </Menu.Item>
            <Menu.Item value="en" onClick={() => handleLocaleChange('en')} color={locale === 'en' ? 'fg.brand' : 'fg'}>
              <Text>🇬🇧 {t('en')}</Text>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
