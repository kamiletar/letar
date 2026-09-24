import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CORE_SCALE_COUNT } from '../_data/bank-stats'
import { ForProfessionalsView } from './_components/for-professionals-view'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isRu = locale === 'ru'
  const tm = await getTranslations({ locale, namespace: 'forProfessionals.meta' })
  const title = tm('title')
  const description = tm('description', { coreScales: CORE_SCALE_COUNT })

  return {
    title,
    description,
    alternates: {
      canonical: isRu ? '/for-professionals' : '/en/for-professionals',
      languages: { ru: '/for-professionals', en: '/en/for-professionals' },
    },
    openGraph: { title, description, type: 'article', locale: isRu ? 'ru_RU' : 'en_US' },
  }
}

/**
 * Страница «Если вы психолог» — руководство для клинических специалистов.
 * Содержимое — `ForProfessionalsView`; `isRu` здесь — только технические значения метаданных.
 */
export default function ForProfessionalsPage({ params }: { params: Promise<{ locale: string }> }) {
  return <ForProfessionalsContent params={params} />
}

async function ForProfessionalsContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ForProfessionalsView locale={locale} />
}
