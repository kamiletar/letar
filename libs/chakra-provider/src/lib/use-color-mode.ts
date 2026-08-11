'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type ColorMode = 'light' | 'dark' | 'system'
export type ResolvedColorMode = 'light' | 'dark'

export interface UseColorModeReturn {
  /** Текущая выбранная тема (может быть 'system') */
  colorMode: ColorMode
  /** Реальная отображаемая тема (только 'light' или 'dark') */
  resolvedColorMode: ResolvedColorMode | undefined
  /** Установить тему */
  setColorMode: (mode: ColorMode) => void
  /** Переключить между light и dark */
  toggleColorMode: () => void
}

/**
 * Хук для управления цветовым режимом приложения.
 * Поддерживает: light, dark, system (по умолчанию).
 */
export function useColorMode(): UseColorModeReturn {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const colorMode = (mounted ? theme : 'system') as ColorMode
  const resolvedColorMode = mounted ? (resolvedTheme as ResolvedColorMode) : undefined

  const setColorMode = (mode: ColorMode) => {
    setTheme(mode)
  }

  const toggleColorMode = () => {
    // Если системная тема - переключаем на противоположную от текущей системной
    if (theme === 'system') {
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  return {
    colorMode,
    resolvedColorMode,
    setColorMode,
    toggleColorMode,
  }
}
