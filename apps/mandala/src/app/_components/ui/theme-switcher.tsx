'use client'

import { IconButton, Menu, Portal } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu'

/** Ключи опций темы */
const themeKeys = ['light', 'dark', 'system'] as const
const themeIcons = {
  light: LuSun,
  dark: LuMoon,
  system: LuMonitor,
} as const

/**
 * Переключатель темы с тремя опциями:
 * - Светлая
 * - Тёмная
 * - Системная (автовыбор)
 */
export function ThemeSwitcher() {
  const t = useTranslations('theme')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Предотвращаем hydration mismatch — рендерим только после монтирования
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Placeholder с той же шириной, чтобы избежать layout shift
    return (
      <IconButton aria-label={t('loading')} variant="ghost" size="sm" color="fg.muted">
        <LuSun />
      </IconButton>
    )
  }

  // Иконка текущей темы
  const CurrentIcon = resolvedTheme === 'dark' ? LuMoon : LuSun

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton aria-label={t('switchLabel')} variant="ghost" size="sm" color="fg.muted" _hover={{ color: 'fg' }}>
          <CurrentIcon />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="140px">
            <Menu.RadioItemGroup value={theme} onValueChange={(e) => setTheme(e.value)}>
              {themeKeys.map((key) => {
                const Icon = themeIcons[key]
                return (
                  <Menu.RadioItem key={key} value={key}>
                    <Icon />
                    {t(key)}
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                )
              })}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
