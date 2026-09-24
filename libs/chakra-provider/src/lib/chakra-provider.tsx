'use client'

import type { ChakraProviderProps } from '@chakra-ui/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ThemeProvider, type ThemeProviderProps } from 'next-themes'
import type { ReactNode } from 'react'

import { useIosActiveFix } from './use-ios-active-fix'

export interface RootChakraProviderProps {
  children: ReactNode
}

type ValueProp = Partial<Pick<ChakraProviderProps, 'value'>>

/**
 * Корневой провайдер Chakra. Заодно включает `:active` на iOS ({@link useIosActiveFix}).
 */
export function RootChakraProvider({ children, value }: RootChakraProviderProps & ValueProp) {
  useIosActiveFix()
  return <ChakraProvider value={value || defaultSystem}>{children}</ChakraProvider>
}

export interface ColorModeProviderProps extends ThemeProviderProps {
  children: ReactNode
  /**
   * Запретить авто-затемнение браузера светлой теме (default: `true`).
   *
   * Brave/Chrome на Android с «Тёмным режимом для сайтов» перекрашивают страницу с
   * `color-scheme: light`, и выбранная светлая тема рендерится тёмной. Провайдер сам пишет
   * `color-scheme: only light` / `dark` по классу темы на `<html>` (CSS, работает до гидратации),
   * а инлайновый `color-scheme` next-themes отключает — он перебил бы это правило.
   * `false` — вернуть поведение next-themes (`enableColorScheme` тогда задаёт приложение).
   */
  lockColorScheme?: boolean
}

/** Селектор `<html>` для темы — по тому же `attribute`/`value`, что настроены у next-themes. */
function themeSelector(
  theme: 'light' | 'dark',
  attribute: ThemeProviderProps['attribute'],
  value: ThemeProviderProps['value'],
) {
  const themeValue = value?.[theme] ?? theme
  const attributes = Array.isArray(attribute) ? attribute : [attribute ?? 'class']
  return attributes
    .map((name) => (name === 'class' ? `html.${themeValue}` : `html[${name}=${themeValue}]`))
    .join(',')
}

/**
 * ColorModeProvider - обёртка над next-themes для управления цветовыми режимами.
 * По умолчанию: системная тема, с возможностью выбора light/dark/system.
 *
 * Заодно закрепляет `color-scheme` темы (`only light` для светлой), чтобы браузерное
 * авто-затемнение не подменяло выбранную тему — см. {@link ColorModeProviderProps.lockColorScheme}.
 */
export function ColorModeProvider({ children, lockColorScheme = true, ...props }: ColorModeProviderProps) {
  const attribute = props.attribute ?? 'class'
  return (
    <ThemeProvider
      attribute={attribute}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...(lockColorScheme ? { enableColorScheme: false } : {})}
      {...props}
    >
      {lockColorScheme && (
        <style>
          {`${themeSelector('light', attribute, props.value)}{color-scheme:only light}${
            themeSelector('dark', attribute, props.value)
          }{color-scheme:dark}`}
        </style>
      )}
      {children}
    </ThemeProvider>
  )
}

export default RootChakraProvider
