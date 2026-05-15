import { FormI18nWrapper } from '@/app/_components/form-i18n-wrapper'
import { SITE_URL } from '@/app/_components/json-ld'
import { OfflineConsentBanner } from '@/app/_components/offline-consent-banner'
import { routing } from '@/i18n/routing'
import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { JSX, ReactNode } from 'react'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Генерация статических параметров для локалей
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * Генерация метаданных с учётом локали
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('title'),
      template: '%s - Elfafeya Art',
    },
    description: t('description'),
    keywords: ['мандалы', 'mandalas', 'точечная роспись', 'dot painting', 'художница Эльфафея', 'artist Elfafeya'],
    authors: [{ name: 'Эльфафея', url: SITE_URL }],
    creator: 'Эльфафея',
    publisher: 'Elfafeya Art',
    alternates: {
      canonical: `/${locale}/`,
      languages: {
        ru: '/ru/',
        en: '/en/',
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
      url: `${SITE_URL}/${locale}/`,
      title: t('title'),
      description: t('description'),
      siteName: 'Elfafeya Art',
      images: [
        {
          url: '/icons/icon-512.png',
          width: 512,
          height: 512,
          alt: 'Elfafeya Art',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/icons/icon-512.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Elfafeya',
    },
    icons: {
      icon: [
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
  }
}

/**
 * Layout для локализованных страниц
 *
 * Добавляет NextIntlClientProvider для клиентских компонентов.
 * Наследует провайдеры от корневого layout.tsx.
 */
export default async function LocaleLayout({ children, params }: Props): Promise<JSX.Element> {
  const { locale } = await params

  // Валидация локали
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Включаем статическую генерацию
  setRequestLocale(locale)

  // Получаем сообщения для текущей локали
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <FormI18nWrapper>{children}</FormI18nWrapper>
      <OfflineConsentBanner />
    </NextIntlClientProvider>
  )
}
