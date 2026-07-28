import { Box, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  robots: { index: true, follow: true },
}

/**
 * Минимальная политика конфиденциальности.
 *
 * Synth — браузерная студия синтеза без форм сбора ПДн и без аккаунтов
 * (v1 не использует БД). Единственный источник cookie — аналитика Umami,
 * которая включается только после согласия пользователя (см. CookieBanner в layout.tsx).
 */
export default function PrivacyPage() {
  return (
    <Box asChild>
      <main>
        <Container maxW="3xl" py={{ base: 16, md: 24 }}>
          <VStack gap={6} align="stretch">
            <Link asChild fontSize="sm" color="fg.muted" _hover={{ color: 'fg' }}>
              <NextLink href="/">&larr; На главную</NextLink>
            </Link>

            <Heading size="xl">Политика конфиденциальности</Heading>
            <Text color="fg.muted" fontSize="sm">
              Действует с 2026 года
            </Text>

            <Text>
              Synth — браузерная студия синтеза звука. Патчи и записи хранятся локально в браузере (IndexedDB), сайт не
              запрашивает имя, email, телефон или другие персональные данные — форм регистрации, подписки или обратной
              связи нет.
            </Text>

            <Heading size="md">Какие cookie мы используем</Heading>
            <Text>
              Сайт использует Umami — приватность-ориентированную веб-аналитику без постоянных идентификаторов и
              рекламных cookie. Она собирает обезличенную статистику посещений (страницы, устройство, страна) и
              загружается только после вашего согласия в баннере cookie. Отозвать согласие можно в любой момент —
              очистите localStorage сайта в настройках браузера.
            </Text>

            <Heading size="md">Обработка персональных данных</Heading>
            <Text>
              Сайт не имеет базы данных на сервере и не передаёт данные третьим лицам, кроме анонимной статистики
              аналитики.
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
  )
}
