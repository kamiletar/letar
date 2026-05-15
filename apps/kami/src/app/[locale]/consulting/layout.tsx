import type { Metadata } from 'next'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ru' ? 'Консалтинг' : 'Consulting',
    description:
      locale === 'ru'
        ? 'Консалтинг по архитектуре и разработке — код-ревью, аудиты, менторство и техническое лидерство'
        : 'Architecture and development consulting — code reviews, audits, mentoring and technical leadership',
    alternates: {
      canonical: `/${locale}/consulting`,
      languages: { ru: '/ru/consulting', en: '/en/consulting' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/consulting` },
  }
}

export default function ConsultingLayout({ children }: Props) {
  return children
}
