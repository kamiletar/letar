import { Footer } from '@/app/_components/footer'
import { Link as IntlLink } from '@/i18n/navigation'
import { Box, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: { index: true, follow: true },
}

/**
 * Минимальная политика конфиденциальности (только на русском — сайт
 * многоязычный, но проект некоммерческий и юридический текст не переведён
 * на все 10 локалей; см. .claude/docs/personal-data.md §5).
 *
 * Aira — открытый P2P-мессенджер. Сайт-витрина не собирает ПДн через формы
 * и не имеет аккаунтов. Единственный источник cookie — аналитика Umami,
 * которая включается только после согласия пользователя (CookieBanner в layout.tsx).
 */
export default function PrivacyPage() {
  return (
    <Box asChild>
      <main>
        <Container maxW="3xl" py={{ base: 24, md: 32 }}>
          <VStack gap={6} align="stretch">
            <Link
              asChild
              fontSize="sm"
              color="fg.muted"
              _hover={{ color: 'fg' }}
              minH="2.75rem"
              alignItems="center"
            >
              <IntlLink href="/">&larr; Aira</IntlLink>
            </Link>

            <Heading size="xl">Политика конфиденциальности</Heading>
            <Text color="fg.muted" fontSize="sm">
              Действует с 2026 года
            </Text>

            <Text>
              Этот сайт — витрина проекта Aira, децентрализованного P2P-мессенджера. Сам мессенджер не хранит ваши
              сообщения на серверах (см. документацию проекта). Сайт-витрина не запрашивает имя, email, телефон или
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
              Сайт-витрина не хранит персональные данные в базе данных и не передаёт их третьим лицам, кроме анонимной
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
