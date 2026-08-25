'use client'

import { SearchProvider } from '@/app/_providers/SearchProvider'
import { system } from '@/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms'
import { QueryProvider } from '@letar/query-provider'

import { ColorModeProvider } from './color-mode'

/**
 * Провайдер Chakra UI + TanStack Query для Animatrona
 *
 * Использует кастомную систему темы с:
 * - Фирменным фиолетовым цветом (brand)
 * - Визуальной обратной связью (_active стили)
 * - Семантическими токенами для dark mode
 * - Поддержкой системной темы (по умолчанию)
 *
 * QueryProvider из @letar/query-provider с preset="standard".
 * SearchProvider — клиентский поиск через Fuse.js (v0.28.9+).
 * Профили кодирования инициализируются в main process (background.ts).
 */
export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider preset="standard">
      <ChakraProvider value={system}>
        <ColorModeProvider>
          <FormI18nProvider locale="ru">
            <SearchProvider>{children}</SearchProvider>
          </FormI18nProvider>
        </ColorModeProvider>
      </ChakraProvider>
    </QueryProvider>
  )
}
