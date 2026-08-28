import { Footer } from '@/app/_components/footer'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Политика конфиденциальности Letar: какие cookie и обезличенную аналитику использует сайт и как управлять согласием.',
  alternates: {
    canonical: 'https://letar.best/privacy/',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Политика конфиденциальности | Letar',
    description: 'Cookie, обезличенная аналитика и управление согласием на сайте Letar.',
    url: 'https://letar.best/privacy/',
    siteName: 'Letar',
    locale: 'ru_RU',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Letar — проекты, сайты, приложения и open source',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Политика конфиденциальности | Letar',
    description: 'Cookie, обезличенная аналитика и управление согласием на сайте Letar.',
    images: ['/twitter-image'],
  },
}

/**
 * Минимальная политика конфиденциальности.
 *
 * Letar — некоммерческая витрина экосистемы проектов, без форм сбора ПДн
 * и без аккаунтов. Единственный источник cookie — аналитика Umami, которая
 * включается только после согласия пользователя (см. CookieBanner в layout.tsx).
 */
export default function PrivacyPage() {
  return (
    <Box asChild>
      <main>
        <Container maxW="3xl" py={{ base: 16, md: 24 }}>
          <VStack gap={6} align="stretch">
            <Heading asChild size="xl">
              <h1>Политика конфиденциальности</h1>
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Действует с 2026 года
            </Text>

            <Text>
              Сайт Letar — некоммерческая витрина экосистемы проектов и приложений. Мы не запрашиваем имя, email,
              телефон или другие персональные данные — на сайте нет форм регистрации, подписки или обратной связи.
            </Text>

            <Heading size="md">Какие cookie мы используем</Heading>
            <Text>
              Сайт использует Umami — приватность-ориентированную веб-аналитику без постоянных идентификаторов и
              рекламных cookie. Она собирает обезличенную статистику посещений (страницы, устройство, страна) и
              загружается только после вашего согласия в баннере cookie. Отозвать согласие можно в любой момент через
              кнопку «Настройки cookie» в подвале сайта.
            </Text>

            <Heading size="md">Обработка персональных данных</Heading>
            <Text>
              Сайт не хранит персональные данные в базе данных и не передаёт их третьим лицам, кроме анонимной
              статистики аналитики.
            </Text>

            <Heading size="md">Контакты</Heading>
            <Text>
              По вопросам обработки данных пишите на{' '}
              <Text asChild fontWeight="medium">
                <span>privacy@letar.best</span>
              </Text>
              .
            </Text>
          </VStack>
        </Container>
        <Footer />
      </main>
    </Box>
  )
}
