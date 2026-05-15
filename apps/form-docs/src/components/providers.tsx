'use client'

import type { I18nConfig } from 'fumadocs-ui/i18n'
import { RootProvider } from 'fumadocs-ui/provider/next'
import type { ReactNode } from 'react'
import { CustomSearchDialog } from './search'

export function Providers({
  children,
  i18n,
}: {
  children: ReactNode
  i18n: I18nConfig
}) {
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
