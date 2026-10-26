import { OfferFaq } from '@/app/[locale]/site/_components/offer-faq'
import { OfferFinalCta } from '@/app/[locale]/site/_components/offer-final-cta'
import { OfferHero } from '@/app/[locale]/site/_components/offer-hero'
import { OfferProjects } from '@/app/[locale]/site/_components/offer-projects'
import { OfferSteps } from '@/app/[locale]/site/_components/offer-steps'
import { OfferTerms } from '@/app/[locale]/site/_components/offer-terms'
import { TaglineReveal } from '@/app/[locale]/site/_components/tagline-reveal'
import { FaqJsonLd } from '@/app/_components/json-ld'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'site' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'
  const path = locale === 'ru' ? '/site/' : '/en/site/'
  const ogImage = {
    url: locale === 'ru' ? '/site/opengraph-image' : '/en/site/opengraph-image',
    width: 1200,
    height: 630,
    alt: 'Kami',
  }
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: path,
      languages: { ru: '/site/', en: '/en/site/' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `${baseUrl}${path}`,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle'),
      description: t('metaDescription'),
      images: [ogImage],
    },
  }
}

/** Посадочная оффера «Заказать сайт»: условия, шаги, FAQ и заявка студии. */
export default async function SitePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('site')
  const faq = t.raw('faq') as { q: string; a: string }[]

  return (
    <>
      <FaqJsonLd items={faq} />
      <OfferHero />
      <OfferTerms />
      <TaglineReveal lines={t.raw('tagline') as string[]} />
      <OfferSteps />
      <OfferProjects />
      <OfferFaq />
      <OfferFinalCta />
    </>
  )
}
