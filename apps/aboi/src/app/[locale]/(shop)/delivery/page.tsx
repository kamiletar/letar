import { Box, Container, Heading, List, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Доставка',
  description: 'Условия и сроки доставки обоев НейроАбоИ',
  alternates: { canonical: '/delivery/' },
}

export default function DeliveryPage() {
  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        <Stack gap={5}>
          <Heading as="h1" size="2xl">
            Доставка
          </Heading>
          <Stack gap={3}>
            <Text>
              Печатаем на следующий рабочий день после поступления оплаты. Доставку считает
              менеджер исходя из веса и габаритов рулона.
            </Text>

            <Heading as="h2" size="md">Способы доставки</Heading>
            <List.Root>
              <List.Item><strong>СДЭК до пункта выдачи</strong> — самый дешёвый.</List.Item>
              <List.Item><strong>СДЭК курьером до двери</strong> — удобнее, чуть дороже.</List.Item>
              <List.Item>
                <strong>Согласовать с менеджером</strong> — для KZ/BY и нестандартных кейсов.
              </List.Item>
            </List.Root>

            <Heading as="h2" size="md">Сроки</Heading>
            <Text>
              Россия — 3-7 рабочих дней. Крайний север и Дальний Восток — до 14 дней. KZ/BY — по
              согласованию с менеджером.
            </Text>

            <Heading as="h2" size="md">Трек-номер</Heading>
            <Text>
              Появляется в личном кабинете и в письме после отгрузки. Также продублируем в
              письме «Заказ отправлен».
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
