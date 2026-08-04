'use client'

import { RootProvider, type RootProviderProps } from 'fumadocs-ui/provider/next'
import type { ReactNode } from 'react'
import { CustomSearchDialog } from './search'

// Пропс i18n просто пробрасывается в RootProvider, поэтому и тип берём от него.
// Раньше здесь стоял I18nUIConfig — это тип всего конфига, а сюда приходит
// результат i18nUI.provider(lang), то есть уже готовые пропсы провайдера.
type I18nProviderConfig = NonNullable<RootProviderProps['i18n']>

export function Providers({ children, i18n }: { children: ReactNode; i18n: I18nProviderConfig }) {
  return (
    <RootProvider
      i18n={i18n}
      search={{
        SearchDialog: CustomSearchDialog,
      }}
    >
      {children}
    </RootProvider>
  )
}
