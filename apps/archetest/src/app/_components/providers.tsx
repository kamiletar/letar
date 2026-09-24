'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'
import { FormI18nProvider } from '@letar/forms'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

/**
 * Корневой провайдер приложения.
 *
 * Включает:
 * - Chakra UI с кастомной темой
 * - Поддержку тёмной/светлой темы
 *
 * `enableColorScheme={false}`: `color-scheme` задаёт тема (`globalCss` в `@/theme`),
 * иначе инлайновый `color-scheme: light` от next-themes разрешил бы браузеру
 * авто-затемнять светлую тему.
 */
export function Providers({ children }: PropsWithChildren) {
  return (
    <EmotionRegistry>
      <ColorModeProvider enableColorScheme={false}>
        <RootChakraProvider value={system}>
          <FormI18nProvider locale="ru">{children}</FormI18nProvider>
        </RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
