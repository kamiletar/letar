'use client'

import { QueryProvider } from '@/app/_components/providers/query-provider'
import { ColorModeProvider, type ColorModeProviderProps } from '@/app/_components/ui/color-mode'
// oxlint-disable-next-line import/no-unassigned-import -- side-effect импорт для русификации Zod
import '@/lib/zod-config'
import { system } from '@/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms'

/**
 * Главный провайдер приложения
 *
 * Включает:
 * - QueryProvider для TanStack Query
 * - ChakraProvider с кастомной темой из src/theme/
 * - ColorModeProvider для поддержки тёмной темы
 */
export function Provider(props: ColorModeProviderProps) {
  return (
    <QueryProvider>
      <ChakraProvider value={system}>
        <FormI18nProvider locale="ru">
          <ColorModeProvider {...props} />
        </FormI18nProvider>
      </ChakraProvider>
    </QueryProvider>
  )
}
