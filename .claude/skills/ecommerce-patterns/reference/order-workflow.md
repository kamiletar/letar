# Order Workflow

## Жизненный цикл заказа

```
PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
    ↓         ↓                    ↓
CANCELLED  REFUNDED           RETURNED
```

## Модели заказа

```zmodel
model Order {
  id            String        @id @default(cuid())
  orderNumber   String        @unique @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  status        OrderStatus   @default(PENDING)
  items         OrderItem[]
  payment       Payment?
  shipping      Shipping?

  // Суммы (в копейках)
  subtotal      Int           // Сумма товаров
  discount      Int           @default(0) // Скидка
  shippingCost  Int           @default(0) // Доставка
  total         Int           // Итого

  // Контактные данные (снэпшот на момент заказа)
  email         String
  phone         String
  address       Json?

  // Комментарии
  customerNote  String?
  internalNote  String?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  paidAt        DateTime?
  shippedAt     DateTime?
  deliveredAt   DateTime?

  @@allow('read', auth() == user)
  @@allow('create', auth() != null)
  @@allow('all', auth().role == 'ADMIN')
}

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id])

  // Снэпшот на момент заказа
  name        String
  price       Int      // Цена за единицу (копейки)
  quantity    Int
  size        String?
  color       String?

  @@allow('all', order.user == auth() || auth().role == 'ADMIN')
}

enum OrderStatus {
  PENDING     // Ожидает оплаты
  PAID        // Оплачен
  PROCESSING  // В обработке
  SHIPPED     // Отправлен
  DELIVERED   // Доставлен
  CANCELLED   // Отменён
  REFUNDED    // Возврат
}
```

## Создание заказа

```typescript
// app/api/orders/route.ts
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { shippingAddress, customerNote } = await request.json()
  const db = await getEnhancedPrisma()

  // Получить корзину
  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } } },
  })

  if (!cart?.items?.length) {
    return Response.json({ error: 'Корзина пуста' }, { status: 400 })
  }

  // Валидация наличия товаров
  for (const item of cart.items) {
    if (item.product.stock < item.quantity) {
      return Response.json(
        {
          error: `Недостаточно товара: ${item.product.name}`,
        },
        { status: 400 },
      )
    }
  }

  // Расчёт сумм
  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shippingCost = subtotal >= 500000 ? 0 : 35000 // Бесплатно от 5000₽
  const total = subtotal + shippingCost

  // Создание заказа в транзакции
  const order = await db.$transaction(async (tx) => {
    // 1. Создать заказ
    const order = await tx.order.create({
      data: {
        userId: session.user.id,
        email: session.user.email,
        phone: session.user.phone || '',
        address: shippingAddress,
        customerNote,
        subtotal,
        shippingCost,
        total,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
        },
      },
    })

    // 2. Резервировать товар
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    // 3. Очистить корзину
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

    return order
  })

  return Response.json(order)
}
```

## Смена статуса

```typescript
// app/api/orders/[id]/status/route.ts
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return Response.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const { id } = await params
  const { status, note } = await request.json()
  const db = await getEnhancedPrisma()

  const order = await db.order.findUnique({ where: { id } })
  if (!order) {
    return Response.json({ error: 'Заказ не найден' }, { status: 404 })
  }

  // Проверка допустимости перехода
  const allowedTransitions = STATUS_TRANSITIONS[order.status]
  if (!allowedTransitions.includes(status)) {
    return Response.json(
      {
        error: `Нельзя перейти из ${order.status} в ${status}`,
      },
      { status: 400 },
    )
  }

  // Обновление с логикой по статусу
  const updateData: any = { status, internalNote: note }

  if (status === 'PAID') {
    updateData.paidAt = new Date()
  } else if (status === 'SHIPPED') {
    updateData.shippedAt = new Date()
  } else if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date()
  } else if (status === 'CANCELLED' || status === 'REFUNDED') {
    // Вернуть товар на склад
    await db.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: id } })
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })
  }

  const updated = await db.order.update({
    where: { id },
    data: updateData,
  })

  // Отправить уведомление пользователю
  await sendOrderStatusNotification(updated)

  return Response.json(updated)
}
```

## Хуки для заказов

```typescript
// app/_hooks/useOrders.ts
export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: async () => {
      const res = await fetch('/api/orders/my')
      if (!res.ok) throw new Error('Ошибка загрузки заказов')
      return res.json()
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`)
      if (!res.ok) throw new Error('Заказ не найден')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json()
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      router.push(`/orders/${order.id}/payment`)
    },
  })
}
```

## Компонент истории заказов

```tsx
'use client'

import { useMyOrders } from '@/app/_hooks/useOrders'
import { formatDate, formatPrice } from '@/lib/format'
import { Badge, Box, HStack, Separator, Text, VStack } from '@chakra-ui/react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ожидает оплаты', color: 'yellow' },
  PAID: { label: 'Оплачен', color: 'blue' },
  PROCESSING: { label: 'В обработке', color: 'purple' },
  SHIPPED: { label: 'Отправлен', color: 'cyan' },
  DELIVERED: { label: 'Доставлен', color: 'green' },
  CANCELLED: { label: 'Отменён', color: 'gray' },
  REFUNDED: { label: 'Возврат', color: 'red' },
}

export function OrderHistory() {
  const { data: orders, isLoading } = useMyOrders()

  if (isLoading) return <Spinner />
  if (!orders?.length) return <Text>У вас пока нет заказов</Text>

  return (
    <VStack gap={4} align="stretch">
      {orders.map((order) => (
        <Box key={order.id} p={4} borderWidth={1} borderRadius="lg">
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="bold">Заказ #{order.orderNumber}</Text>
            <Badge colorPalette={STATUS_LABELS[order.status].color}>{STATUS_LABELS[order.status].label}</Badge>
          </HStack>

          <Text fontSize="sm" color="fg.muted">
            {formatDate(order.createdAt)}
          </Text>

          <Separator my={2} />

          <VStack align="stretch" gap={1}>
            {order.items.map((item) => (
              <HStack key={item.id} justify="space-between">
                <Text>
                  {item.name} × {item.quantity}
                  {item.size && ` (${item.size})`}
                </Text>
                <Text>{formatPrice(item.price * item.quantity)}</Text>
              </HStack>
            ))}
          </VStack>

          <Separator my={2} />

          <HStack justify="space-between" fontWeight="bold">
            <Text>Итого</Text>
            <Text>{formatPrice(order.total)}</Text>
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}
```

## Email уведомления

```typescript
// lib/notifications/order-email.ts
import { resend } from '@/lib/resend'

export async function sendOrderStatusNotification(order: Order) {
  const templates = {
    PAID: {
      subject: `Заказ #${order.orderNumber} оплачен`,
      template: 'order-paid',
    },
    SHIPPED: {
      subject: `Заказ #${order.orderNumber} отправлен`,
      template: 'order-shipped',
    },
    DELIVERED: {
      subject: `Заказ #${order.orderNumber} доставлен`,
      template: 'order-delivered',
    },
  }

  const config = templates[order.status]
  if (!config) return

  await resend.emails.send({
    from: 'Premium Rosstil <orders@premium-rosstil.ru>',
    to: order.email,
    subject: config.subject,
    react: OrderEmailTemplate({ order, template: config.template }),
  })
}
```
