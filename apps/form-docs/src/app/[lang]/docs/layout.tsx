import { SkinProvider } from '@/components/skin/skin-context'
import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'

export default async function Layout({ params, children }: { params: Promise<{ lang: string }>; children: ReactNode }) {
  const { lang } = await params

  return (
    // SkinProvider — общее состояние переключателя Chakra/shadcn для всех страниц докс-раздела
    // (P7 PLAN.md, решение 3). Не оборачивает /demo/* — те живут в отдельном layout без Fumadocs.
    <SkinProvider>
      <DocsLayout {...baseOptions(lang)} tree={source.getPageTree(lang)}>
        {children}
      </DocsLayout>
    </SkinProvider>
  )
}
