import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { Hero } from '@/app/_components/hero/hero'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'
  // ⚠️ Адрес без /ru/: файловая конвенция отдаёт /ru/opengraph-image, а он редиректит на путь без префикса
  const ogImage = {
    url: locale === 'ru' ? '/opengraph-image' : '/en/opengraph-image',
    width: 1200,
    height: 630,
    alt: 'Kami',
  }
  return {
    alternates: {
      canonical: `/${locale}/`,
      languages: { ru: '/ru/', en: '/en/' },
    },
    openGraph: { url: `${baseUrl}/${locale}/`, images: [ogImage] },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <Hero />
}
