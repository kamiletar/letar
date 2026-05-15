import { Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Оплата не прошла',
  robots: { index: false, follow: false },
}

export default async function PaymentFailedPage({
  params,
}: {
  params: Promise<{ orderNumber: string; locale: string }>
}) {
  const { orderNumber } = await params

  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="2xl" py={{ base: 12, md: 20 }}>
        <Stack gap={6} textAlign="center">
          <Box fontSize="6xl">😔</Box>
          <Heading as="h1" size="3xl">
            Оплата не прошла
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            К сожалению, оплата заказа <strong>{orderNumber}</strong> не была завершена. Не переживайте — заказ
            сохранён, вы можете попробовать оплатить снова или связаться с менеджером.
          </Text>

          <Box p={5} bg="orange.subtle" borderRadius="xl">
            <Text fontSize="sm" color="orange.fg">
              Номер заказа: <strong>{orderNumber}</strong>. Сохраните его на случай обращения в поддержку.
            </Text>
          </Box>

          <Stack gap={2} direction={{ base: 'column', sm: 'row' }} justify="center">
            <Button asChild colorPalette="brand" size="lg">
              <Link href="/cart">Вернуться в корзину</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/profile/orders">Мои заказы</Link>
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
