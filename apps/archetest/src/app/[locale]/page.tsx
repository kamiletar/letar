import { getSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getDisclaimerStatusAction } from './_actions/disclaimer.action'
import { getQuizProgressAction, getRandomQuestionsAction } from './_actions/quiz.action'
import { QuizContainer } from './_components/quiz-container'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'quiz' })
  const isRu = locale === 'ru'
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: isRu ? '/' : '/en',
      languages: { ru: '/', en: '/en' },
    },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [session, questions] = await Promise.all([getSession(), getRandomQuestionsAction(50)])
  const isAuthenticated = !!session

  // Загружаем прогресс и статус дисклеймера для авторизованных пользователей
  const [progress, disclaimerAccepted] = isAuthenticated
    ? await Promise.all([getQuizProgressAction(), getDisclaimerStatusAction()])
    : [null, false]

  return (
    <QuizContainer
      questions={questions}
      isAuthenticated={isAuthenticated}
      initialProgress={progress}
      initialDisclaimerAccepted={disclaimerAccepted}
    />
  )
}
