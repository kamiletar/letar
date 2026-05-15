import { Box, Container, Heading, List, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика обработки персональных данных',
  description: 'Политика обработки и защиты персональных данных НейроАбоИ',
  alternates: { canonical: '/privacy/' },
}

export default function PrivacyPage() {
  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        <Stack gap={5}>
          <Heading as="h1" size="2xl">
            Политика обработки персональных данных
          </Heading>

          <Text color="fg.muted" fontSize="sm">
            Действует с 2026-05-06. Оператор: ИП Гаев Виталий Викторович, ИНН 246603783032.
          </Text>

          <Stack gap={3}>
            <Heading as="h2" size="md">1. Какие данные мы собираем</Heading>
            <Text>
              Имя и контакты (email, телефон) — для оформления и доставки заказов; адрес доставки;
              IP и user-agent — в служебных логах для безопасности; cookie — для работы сайта
              (auth-сессия, корзина) и опционально для аналитики (Я.Метрика, Umami) с вашего
              согласия.
            </Text>

            <Heading as="h2" size="md">2. Цели обработки</Heading>
            <Text>
              Заключение и исполнение договора купли-продажи; информирование о статусе заказа
              (email и телефон); ведение бухгалтерского учёта (54-ФЗ); защита от мошенничества;
              маркетинг (только при отдельном согласии).
            </Text>

            <Heading as="h2" size="md">3. Срок хранения</Heading>
            <Text>
              Данные о заказах — 5 лет (закон о бухгалтерском учёте). Данные аккаунта — до отзыва
              согласия. Cookie — до 60 дней.
            </Text>

            <Heading as="h2" size="md">4. Передача третьим лицам</Heading>
            <List.Root>
              <List.Item>СДЭК — для доставки заказа (ФИО, адрес, телефон).</List.Item>
              <List.Item>Tinkoff Касса — для онлайн-оплаты (когда подключим, W1).</List.Item>
              <List.Item>SMTP-провайдер — для отправки писем (email, имя).</List.Item>
            </List.Root>

            <Heading as="h2" size="md">5. Ваши права (152-ФЗ)</Heading>
            <Text>
              Вы можете в любой момент: получить копию своих данных, исправить их, удалить
              аккаунт, отозвать согласие на маркетинг, пожаловаться в Роскомнадзор. Запросы
              отправляйте на <strong>privacy@neyroaboi.ru</strong> — отвечаем в течение 30 дней.
            </Text>

            <Heading as="h2" size="md">6. Безопасность</Heading>
            <Text>
              Сервера в РФ (требование 152-ФЗ ст. 18 ч. 5). Пароли хранятся в виде bcrypt-хэша.
              HTTPS на всех страницах. Доступ к админ-панели — только по логину/паролю.
            </Text>

            <Heading as="h2" size="md">7. Контакты</Heading>
            <Text>
              ИП Гаев Виталий Викторович, ИНН 246603783032. Email: <strong>privacy@neyroaboi.ru</strong>.
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
