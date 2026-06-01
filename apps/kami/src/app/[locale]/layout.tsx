import { MainMatrix } from '@/app/[locale]/main-matrix'
import { ChatWidgetLazy } from '@/app/_components/chat/chat-widget-lazy'
import { Footer } from '@/app/_components/footer/footer'
import { Header } from '@/app/_components/header/header'
import { JsonLd } from '@/app/_components/json-ld'
import { SkipLink } from '@/app/_components/skip-link'
import { ThemeProvider } from '@/app/_components/theme-provider'
import { Toaster } from '@/app/_components/ui/toaster'
import { type UserContextValue, UserProvider } from '@/app/_components/user-provider'
import '@/app/global.css'
import { routing } from '@/i18n/routing'
import { getSession, isAdmin } from '@/lib/auth'
import { Box, Flex } from '@chakra-ui/react'
import { UmamiScript } from '@letar/analytics'
import { ColorModeProvider } from '@letar/chakra-provider'
import { YandexMetrika } from '@letar/yandex-metrika'
import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'

// Шрифты
const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-mono',
})

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const messages = await getMessages()
  const metadata = messages.metadata as { title: string; description: string }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'

  return {
    title: {
      default: metadata.title,
      template: `%s | Kami`,
    },
    description: metadata.description,
    keywords: [
      'frontend',
      'architect',
      'developer',
      'react',
      'next.js',
      'typescript',
      'fullstack',
      locale === 'ru' ? 'разработчик' : 'developer',
      locale === 'ru' ? 'портфолио' : 'portfolio',
    ],
    authors: [{ name: 'Kami' }],
    creator: 'Kami',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${locale}/`,
      languages: {
        ru: '/ru/',
        en: '/en/',
      },
      types: {
        'application/rss+xml': `/${locale}/feed.xml/`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
      url: `${baseUrl}/${locale}/`,
      siteName: 'Kami Portfolio',
      title: metadata.title,
      description: metadata.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.title,
      description: metadata.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Валидация локали
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Включаем статическую генерацию
  setRequestLocale(locale)

  // Получаем сообщения и сессию для текущей локали
  const [messages, session, admin] = await Promise.all([getMessages(), getSession(), isAdmin()])

  const userContext: UserContextValue = {
    id: session?.user?.id ?? null,
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
    roles: ((session?.user as { roles?: string[] })?.roles ?? []) as UserContextValue['roles'],
    isAuthenticated: !!session,
    isAdmin: admin,
  }

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <JsonLd locale={locale} />
      </head>
      <body>
        <ColorModeProvider>
          <ThemeProvider
            fonts={{
              heading: inter,
              body: inter,
              mono: jetbrainsMono,
            }}
          >
            <NextIntlClientProvider messages={messages}>
              <UserProvider value={userContext}>
                <SkipLink />
                <Flex direction="column" minH="100vh">
                  <Header />
                  <Box as="main" id="main-content" flex="1" tabIndex={-1} outline="none">
                    {/* Matrix Rain Background */}
                    <MainMatrix />
                    {children}
                  </Box>
                  <Footer />
                </Flex>
                <Toaster />
                {process.env.ANTHROPIC_API_KEY && <ChatWidgetLazy />}
                <YandexMetrika YM_COUNTER_ID={Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID) || 0} />
                <UmamiScript />
              </UserProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </ColorModeProvider>
      </body>
    </html>
  )
}
