import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Оплата',
  description: 'Способы оплаты заказа в НейроАбоИ',
  alternates: { canonical: '/payment/' },
}

export default function PaymentPage() {
  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        <Stack gap={5}>
          <Heading as="h1" size="2xl">
            Оплата
          </Heading>
          <Stack gap={3}>
            <Text>
              На запуске MVP оплата происходит по счёту от менеджера. После оформления заказа на
              сайте мы свяжемся с вами в течение рабочего дня и пришлём реквизиты для оплаты.
              После поступления денег — печатаем тираж на следующий рабочий день.
            </Text>
            <Text fontSize="sm" color="fg.muted">
              В ближайшие месяцы подключим онлайн-оплату Tinkoff (карта или СБП) с
              автоматическим формированием чеков по 54-ФЗ.
            </Text>
            <Heading as="h2" size="md">Промокоды и сертификаты</Heading>
            <Text>
              Промокод вводится на странице оформления заказа в поле «Скидки». Подарочный
              сертификат — там же (код + PIN), баланс расходуется частями.
            </Text>
            <Heading as="h2" size="md">Бонусы партнёрской программы</Heading>
            <Text>
              Если у вас есть бонусы (заработанные через реферальную программу) — на чекауте
              можно списать любую сумму до баланса.
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
