import { Providers } from '@/components/providers'
import { i18nUI } from '@/lib/layout.shared'
import type { ReactNode } from 'react'

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>
  children: ReactNode
}) {
  const { lang } = await params

  return <Providers i18n={i18nUI.provider(lang)}>{children}</Providers>
}
