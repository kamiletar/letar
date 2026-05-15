'use client'

import type { ThemeProviderProps } from 'next-themes'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type ColorModeProviderProps = ThemeProviderProps

/**
 * ColorModeProvider — обёртка над next-themes.
 *
 * Поддерживает светлую и тёмную темы с автоопределением системной темы.
 * suppressHydrationWarning на <html> в layout.tsx предотвращает
 * предупреждения о гидратации (next-themes внедряет скрипт до React).
 */
export function ColorModeProvider(props: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props} attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange />
  )
}

/**
 * Хук для использования цветовой схемы.
 */
export function useColorMode() {
  const { theme, setTheme } = useTheme()
  return {
    colorMode: theme,
    setColorMode: setTheme,
    toggleColorMode: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}

/**
 * Хук для выбора значения в зависимости от темы.
 * Возвращает light-значение на сервере и до монтирования.
 */
export function useColorModeValue<T>(light: T, dark: T): T {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  // На сервере и до монтирования возвращаем light (default)
  if (!mounted) {
    return light
  }

  return resolvedTheme === 'dark' ? dark : light
}
