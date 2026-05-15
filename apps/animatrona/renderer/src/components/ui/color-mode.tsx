'use client'

import type { IconButtonProps } from '@chakra-ui/react'
import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react'
import type { ThemeProviderProps } from 'next-themes'
import { ThemeProvider, useTheme } from 'next-themes'
import { forwardRef } from 'react'
import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu'

export type ColorModeProviderProps = ThemeProviderProps

/** Тип темы: light, dark или system */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Провайдер темы с поддержкой системной темы
 *
 * По умолчанию используется системная тема (следует за настройками ОС)
 */
export function ColorModeProvider(props: ColorModeProviderProps) {
  return <ThemeProvider attribute="class" disableTransitionOnChange defaultTheme="system" {...props} />
}

/**
 * Хук для управления темой
 *
 * @returns colorMode — текущий режим (light/dark после resolving)
 * @returns theme — выбранная тема (light/dark/system)
 * @returns setTheme — установить тему
 * @returns toggleColorMode — переключить между light/dark
 */
export function useColorMode() {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const toggleColorMode = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }
  return {
    /** Текущий режим после resolving системной темы (light или dark) */
    colorMode: resolvedTheme as 'light' | 'dark' | undefined,
    /** Выбранная тема (light, dark или system) */
    theme: theme as ThemeMode | undefined,
    /** Установить тему */
    setTheme,
    /** Переключить между light/dark (игнорирует system) */
    toggleColorMode,
  }
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode()
  return colorMode === 'light' ? light : dark
}

/**
 * Иконка текущего режима темы
 *
 * - LuSun для светлой
 * - LuMoon для тёмной
 */
export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return colorMode === 'light' ? <LuSun /> : <LuMoon />
}

/**
 * Иконка выбранной темы (включая system)
 *
 * - LuSun для light
 * - LuMoon для dark
 * - LuMonitor для system
 */
export function ThemeIcon({ theme }: { theme?: ThemeMode }) {
  if (theme === 'light') {
    return <LuSun />
  }
  if (theme === 'dark') {
    return <LuMoon />
  }
  return <LuMonitor />
}

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>

export const ColorModeButton = forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode()
    return (
      <ClientOnly fallback={<Skeleton boxSize="8" />}>
        <IconButton
          onClick={toggleColorMode}
          variant="ghost"
          aria-label="Toggle color mode"
          size="sm"
          ref={ref}
          {...props}
          css={{
            _icon: {
              width: '5',
              height: '5',
            },
          }}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    )
  }
)
