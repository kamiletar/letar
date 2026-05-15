import { redirect } from '@/i18n/server-redirect'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa'

export const metadata = {
  title: 'Заказ оформлен — Премиум РосСтиль',
  description: 'Ваш заказ успешно оформлен',
}

interface PageProps {
  searchParams: Promise<{ orderNumber?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const user = await requireAuth()
  const params = await searchParams
  const orderNumber = params.orderNumber

  if (!orderNumber) {
    redirect('/')
  }

  // Загрузить заказ и статус оплаты
  const db = getEnhancedPrisma(user)
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: {
      status: true,
      payments: {
        select: { status: true, confirmationUrl: true },
        take: 1,
      },
    },
  })

  const payment = order?.payments[0]
  const isPaid = payment?.status === 'SUCCEEDED' || order?.status === 'CONFIRMED'
  const isCanceled = payment?.status === 'CANCELLED' || order?.status === 'CANCELLED'
  const isPending = payment?.status === 'PENDING'

  return (
    <Container maxW="4xl" py={16}>
      <VStack align="center" gap={8} textAlign="center">
        {/* Иконка статуса */}
        <Box>
          {isCanceled ? (
            <Icon boxSize={20} color="red.500">
              <FaTimesCircle />
            </Icon>
          ) : isPending ? (
            <Icon boxSize={20} color="orange.500">
              <FaClock />
            </Icon>
          ) : (
            <Icon boxSize={20} color="green.500">
              <FaCheckCircle />
            </Icon>
          )}
        </Box>

        {/* Заголовок */}
        <VStack gap={2}>
          <Heading size="3xl" textTransform="none">
            {isCanceled ? 'Оплата не прошла' : isPending ? 'Ожидаем оплату' : 'Заказ успешно оформлен!'}
          </Heading>
          <Text fontSize="xl" color="fg.muted">
            Номер заказа: <strong>{orderNumber}</strong>
          </Text>
        </VStack>

        {/* Информация */}
        <VStack gap={4} maxW="2xl">
          {isCanceled ? (
            <Text fontSize="lg">
              К сожалению, оплата была отменена. Товары возвращены на склад. Вы можете попробовать оформить заказ
              заново.
            </Text>
          ) : isPending ? (
            <>
              <Text fontSize="lg">
                Заказ создан. Ожидаем подтверждение оплаты от платёжной системы. Обычно это занимает несколько секунд.
              </Text>
              {payment?.confirmationUrl && (
                <Button asChild colorPalette="fg" size="lg">
                  <a href={payment.confirmationUrl}>Перейти к оплате</a>
                </Button>
              )}
            </>
          ) : (
            <>
              <Text fontSize="lg">
                {isPaid
                  ? 'Оплата прошла успешно! Мы начнём обработку вашего заказа.'
                  : 'Спасибо за ваш заказ! Мы получили вашу заявку и свяжемся с вами в ближайшее время для подтверждения деталей доставки.'}
              </Text>
              <Text color="fg.muted">
                Информация о заказе отправлена на указанный вами телефон и email. Вы можете отслеживать статус заказа в
                личном кабинете.
              </Text>
            </>
          )}
        </VStack>

        {/* Кнопки навигации */}
        <VStack gap={3} width="100%" maxW="md">
          <Button asChild colorPalette="fg" size="lg" width="100%">
            <NextLink href="/catalog">{isCanceled ? 'Вернуться в каталог' : 'Продолжить покупки'}</NextLink>
          </Button>

          <Button asChild variant="outline" size="lg" width="100%">
            <NextLink href="/profile">Перейти в личный кабинет</NextLink>
          </Button>
        </VStack>

        {/* Контактная информация */}
        <Box mt={8} p={6} borderWidth="1px" borderRadius="lg" bg="bg.subtle" width="100%" maxW="2xl">
          <VStack gap={3}>
            <Text fontWeight="semibold">Остались вопросы?</Text>
            <Text fontSize="sm" color="fg.muted">
              Свяжитесь с нами по телефону или email, указанным на странице{' '}
              <NextLink href="/contacts" style={{ textDecoration: 'underline' }}>
                контакты
              </NextLink>
              .
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
