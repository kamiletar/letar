import { Footer } from '@/app/_components/footer'
import { Header } from '@/app/_components/header'
import { Box, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  robots: { index: true, follow: true },
}

/**
 * Минимальная политика конфиденциальности.
 *
 * Pravda — литературно-юмористический некоммерческий проект без форм сбора
 * ПДн и без аккаунтов. Единственный источник cookie — аналитика Umami,
 * которая включается только после согласия пользователя (см. CookieBanner в layout.tsx).
 */
export default function PrivacyPage() {
  return (
    <Flex direction="column" minH="100vh">
      <Header />
      <Box asChild flex="1">
        <main>
          <Container maxW="3xl" py={{ base: 16, md: 24 }}>
            <VStack gap={6} align="stretch">
              <Heading size="xl">Политика конфиденциальности</Heading>
              <Text color="fg.muted" fontSize="sm">
                Действует с 2026 года
              </Text>

              <Text>
                Pravda — некоммерческий литературно-юмористический проект. Мы не запрашиваем имя, email, телефон или
                другие персональные данные — на сайте нет форм регистрации, подписки или обратной связи.
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
        </main>
      </Box>
      <Footer />
    </Flex>
  )
}
