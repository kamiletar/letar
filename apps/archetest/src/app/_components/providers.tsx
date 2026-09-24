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
 * - Локаль подсказок и ошибок полей @letar/forms
 *
 * `locale` — пропом, а не `useLocale()`: `(auth)/layout` рендерит провайдер вне
 * NextIntlClientProvider. Раньше здесь стояло `locale="ru"` — в EN-версии подсказки и
 * тексты валидации полей форм оставались русскими.
 */
export function Providers({ children, locale = 'ru' }: PropsWithChildren<{ locale?: string }>) {
  return (
    <EmotionRegistry>
      <ColorModeProvider>
        <RootChakraProvider value={system}>
          <FormI18nProvider locale={locale}>{children}</FormI18nProvider>
        </RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
