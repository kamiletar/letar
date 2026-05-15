import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { getDocumentByHref, getDocumentMetadata } from '@/lib/seo'

import { ArticleJsonLd, DocumentBreadcrumbJsonLd } from '../../../_components/json-ld'

const HREF = '/codes/family'
const doc = getDocumentByHref(HREF)!

export const metadata: Metadata = getDocumentMetadata(HREF)

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <ArticleJsonLd
        title={doc.title}
        description={doc.description || `${doc.title} — ${doc.category}`}
        href={doc.href}
        category={doc.category}
      />
      <DocumentBreadcrumbJsonLd title={doc.title} href={doc.href} category={doc.category} />
      {children}
    </>
  )
}
