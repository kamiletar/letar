'use client'

import { IconButton, Menu, Portal } from '@chakra-ui/react'
import type { ThemeProviderProps } from 'next-themes'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import * as React from 'react'
import { LuCheck, LuMonitor, LuMoon, LuSun } from 'react-icons/lu'

export type ColorModeProviderProps = ThemeProviderProps

export function ColorModeProvider(props: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props} attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange />
  )
}

type ThemeValue = 'light' | 'dark' | 'system'

const themeOptions: { value: ThemeValue; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Светлая', icon: <LuSun /> },
  { value: 'dark', label: 'Тёмная', icon: <LuMoon /> },
  { value: 'system', label: 'Системная', icon: <LuMonitor /> },
]

// Иконка для текущей темы
function ThemeIcon({ theme, resolvedTheme }: { theme: string | undefined; resolvedTheme: string | undefined }) {
  if (theme === 'system') {
    return <LuMonitor />
  }
  // Используем resolvedTheme для определения фактической темы
  const effectiveTheme = theme || resolvedTheme
  return effectiveTheme === 'dark' ? <LuSun /> : <LuMoon />
}

export function ColorModeButton() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton aria-label="Переключить тему" variant="ghost" size="sm">
          <ThemeIcon theme={theme} resolvedTheme={resolvedTheme} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner zIndex={'10000 !important'}>
          <Menu.Content minW="140px">
            <Menu.RadioItemGroup value={theme || 'system'} onValueChange={(e) => setTheme(e.value)}>
              {themeOptions.map((option) => (
                <Menu.RadioItem key={option.value} value={option.value}>
                  {option.icon}
                  {option.label}
                  <Menu.ItemIndicator>
                    <LuCheck />
                  </Menu.ItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

export function useColorMode() {
  const { theme, setTheme } = useTheme()
  return {
    colorMode: theme,
    setColorMode: setTheme,
    toggleColorMode: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}

export function useColorModeValue<T>(light: T, dark: T): T {
  const [mounted, setMounted] = React.useState(false)
  const { resolvedTheme } = useTheme()

  React.useEffect(() => setMounted(true), [])

  // На сервере и до монтирования возвращаем light (default)
  if (!mounted) {
    return light
  }

  return resolvedTheme === 'dark' ? dark : light
}
