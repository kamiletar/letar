import { Link } from '@/i18n/navigation'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { OrderCard } from './_components/order-card'

export const metadata = {
  title: 'Мои заказы — Премиум РосСтиль',
  description: 'История ваших заказов',
}

export default async function OrdersPage() {
  // Проверка авторизации
  const authUser = await requireAuth()

  // Получение заказов пользователя
  const db = getEnhancedPrisma(authUser)
  const orders = await db.order.findMany({
    where: {
      userId: authUser.id,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: 'desc', // Новые заказы первыми
    },
  })

  return (
    <Container maxW="7xl" py={8}>
      <Heading size="3xl" mb={8} textTransform="none">
        Мои заказы
      </Heading>

      {orders.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="xl" color="fg.muted" mb={4}>
            У вас пока нет заказов
          </Text>
          <Text color="fg.muted">
            Перейдите в{' '}
            <Link href="/catalog" style={{ textDecoration: 'underline' }}>
              каталог
            </Link>
            , чтобы выбрать товары
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {orders.map((order: (typeof orders)[number]) => (
            <OrderCard
              key={order.id}
              order={{
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: Number(order.totalAmount),
                createdAt: order.createdAt,
                itemsCount: order.items.reduce(
                  (sum: number, item: (typeof order.items)[number]) => sum + item.quantity,
                  0
                ),
              }}
            />
          ))}
        </VStack>
      )}
    </Container>
  )
}
