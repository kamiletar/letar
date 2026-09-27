import { Footer } from '@/app/_components/footer'
import { Navbar } from '@/app/_components/navbar'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

const PAGE_URL = 'https://kamikeythe.letar.best/privacy'
const PAGE_TITLE = 'Политика конфиденциальности'
const PAGE_DESCRIPTION =
  'Политика обработки персональных данных KamiKeyThe — какие cookie использует сайт и почему на нём нет форм сбора ПДн.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: 'KamiKeyThe',
    locale: 'ru_RU',
    type: 'website',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
}

/**
 * Минимальная политика конфиденциальности.
 *
 * KamiKeyThe — некоммерческая витрина Windows-утилиты без форм сбора ПДн
 * и без аккаунтов. Единственный источник cookie — аналитика Umami, которая
 * включается только после согласия пользователя (см. CookieBanner в layout.tsx).
 */
export default function PrivacyPage() {
  return (
    <Box asChild>
      <main>
        <Navbar />
        <Container maxW="3xl" py={{ base: 16, md: 24 }}>
          <VStack gap={6} align="stretch">
            <Heading asChild size="xl">
              <h1>Политика конфиденциальности</h1>
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Действует с 2026 года
            </Text>

            <Text>
              Сайт KamiKeyThe — некоммерческая витрина Windows-утилиты для ввода типографских символов. Мы не
              запрашиваем имя, email, телефон или другие персональные данные — на сайте нет форм регистрации, подписки
              или обратной связи.
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
