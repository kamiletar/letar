import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { HeroClient } from './_components/hero-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'
  return {
    alternates: {
      canonical: `/${locale}/`,
      languages: { ru: '/ru/', en: '/en/' },
    },
    openGraph: { url: `${baseUrl}/${locale}/` },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HeroClient />
}
