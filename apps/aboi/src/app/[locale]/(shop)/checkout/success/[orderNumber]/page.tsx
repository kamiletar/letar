import { prismaAuth } from '@/lib/prisma'
import { Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Заказ оформлен',
  robots: { index: false, follow: false },
}

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string; locale: string }>
}) {
  const { orderNumber } = await params
  const order = await prismaAuth.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  })

  if (!order) { notFound() }

  const isPaid = order.status === 'PAID'

  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="2xl" py={{ base: 12, md: 20 }}>
        <Stack gap={6} textAlign="center">
          <Box fontSize="6xl">{isPaid ? '✅' : '🎉'}</Box>
          <Heading as="h1" size="3xl">
            {isPaid ? 'Оплата подтверждена!' : 'Спасибо за заказ!'}
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            {isPaid ? (
              <>
                Оплата заказа <strong>{order.orderNumber}</strong> получена. Мы уже готовим ваши обои — срок
                изготовления 1 рабочий день. Письмо с подтверждением отправлено на {order.customerEmail}.
              </>
            ) : (
              <>
                Заказ <strong>{order.orderNumber}</strong> оформлен. Ожидаем подтверждение оплаты — как только оплата
                поступит, вы получите письмо и мы приступим к изготовлению.
              </>
            )}
          </Text>

          <Box p={5} bg="bg.subtle" borderRadius="xl" textAlign="start">
            <Stack gap={2} fontSize="sm">
              <Text>
                <strong>Сумма:</strong> {(order.totalToPay / 100).toFixed(0)} ₽
              </Text>
              <Text>
                <strong>Email:</strong> {order.customerEmail}
              </Text>
              <Text>
                <strong>Телефон:</strong> {order.customerPhone}
              </Text>
            </Stack>
          </Box>

          <Stack gap={2} direction={{ base: 'column', sm: 'row' }} justify="center">
            <Button asChild colorPalette="brand" size="lg">
              <Link href="/catalog">Вернуться в каталог</Link>
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
