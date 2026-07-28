import { getSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { getExpressQuestionsAction } from '../_actions/express.action'
import { ExpressContainer } from '../_components/express-container'
import { KioskResetButton } from '../_components/kiosk-reset-button'
import { OfflineConsentBanner } from '../_components/offline-consent-banner'
import { ServiceWorkerRegistration } from '../_components/service-worker-registration'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'express' })
  const isRu = locale === 'ru'
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: isRu ? '/express' : '/en/express',
      languages: { ru: '/express', en: '/en/express' },
    },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  }
}

export default async function ExpressPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [session, questions] = await Promise.all([getSession(), getExpressQuestionsAction()])

  return (
    <>
      <ExpressContainer questions={questions} isAuthenticated={!!session} />
      {/* Offline-first (5.7): SW только по согласию, баннер предлагает включить */}
      <ServiceWorkerRegistration />
      <OfflineConsentBanner />
      {/* Kiosk-режим (5.7): сброс между посетителями, активен при ?kiosk=1 */}
      <KioskResetButton />
    </>
  )
}
