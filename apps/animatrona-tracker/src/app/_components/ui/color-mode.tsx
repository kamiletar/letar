'use client'

import { IconButton } from '@chakra-ui/react'
import type { ThemeProviderProps } from 'next-themes'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import * as React from 'react'
import { LuMoon, LuSun } from 'react-icons/lu'

export function ColorModeProvider(props: ThemeProviderProps) {
  return <NextThemesProvider {...props} attribute="class" disableTransitionOnChange />
}

export function ColorModeButton() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === 'dark'

  return (
    <IconButton
      aria-label="Toggle color mode"
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <LuSun /> : <LuMoon />}
    </IconButton>
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
