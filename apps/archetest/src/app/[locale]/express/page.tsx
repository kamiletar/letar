import { getSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { getExpressQuestionsAction } from '../_actions/express.action'
import { ExpressContainer } from '../_components/express-container'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'express' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function ExpressPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [session, questions] = await Promise.all([getSession(), getExpressQuestionsAction()])

  return <ExpressContainer questions={questions} isAuthenticated={!!session} />
}
