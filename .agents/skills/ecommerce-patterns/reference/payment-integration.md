# Payment Integration

## Модель платежа

```zmodel
model Payment {
  id              String        @id @default(cuid())
  orderId         String        @unique
  order           Order         @relation(fields: [orderId], references: [id])

  provider        PaymentProvider
  externalId      String?       // ID в платёжной системе
  status          PaymentStatus @default(PENDING)

  amount          Int           // Сумма в копейках
  currency        String        @default("RUB")

  // Метаданные
  method          String?       // card, sbp, qr
  cardLast4       String?       // Последние 4 цифры карты

  createdAt       DateTime      @default(now())
  paidAt          DateTime?

  @@allow('read', order.user == auth())
  @@allow('all', auth().role == 'ADMIN')
}

enum PaymentProvider {
  YOOKASSA
  TINKOFF
  SBERBANK
}

enum PaymentStatus {
  PENDING       // Ожидает оплаты
  PROCESSING    // В обработке
  SUCCEEDED     // Успешно
  FAILED        // Ошибка
  CANCELLED     // Отменён
  REFUNDED      // Возврат
}
```

## ЮKassa интеграция

```typescript
// lib/payment/yookassa.ts
import { ICreatePayment, YooCheckout } from '@a2seven/yoo-checkout'

const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID!,
  secretKey: process.env.YOOKASSA_SECRET_KEY!,
})

export async function createPayment(order: Order): Promise<{
  confirmationUrl: string
  paymentId: string
}> {
  const payload: ICreatePayment = {
    amount: {
      value: (order.total / 100).toFixed(2), // Конвертация копеек
      currency: 'RUB',
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.NEXT_PUBLIC_URL}/orders/${order.id}/status`,
    },
    description: `Заказ #${order.orderNumber}`,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
  }

  const payment = await checkout.createPayment(payload)

  return {
    confirmationUrl: payment.confirmation.confirmation_url,
    paymentId: payment.id,
  }
}

export async function getPaymentStatus(paymentId: string) {
  const payment = await checkout.getPayment(paymentId)
  return payment.status
}

export async function refundPayment(paymentId: string, amount: number) {
  const refund = await checkout.createRefund({
    payment_id: paymentId,
    amount: {
      value: (amount / 100).toFixed(2),
      currency: 'RUB',
    },
  })
  return refund
}
```

## Webhook обработка

```typescript
// app/api/webhooks/yookassa/route.ts
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

// Безопасность: проверка IP ЮKassa
const YOOKASSA_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
]

export async function POST(request: Request) {
  // Проверка IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || ''

  // В production проверять IP
  // if (!isIpInRange(ip, YOOKASSA_IPS)) {
  //   return Response.json({ error: 'Forbidden' }, { status: 403 })
  // }

  const event = await request.json()
  const db = await getEnhancedPrisma()

  switch (event.event) {
    case 'payment.succeeded': {
      const { id, metadata, payment_method } = event.object

      await db.$transaction(async (tx) => {
        // Обновить платёж
        await tx.payment.update({
          where: { externalId: id },
          data: {
            status: 'SUCCEEDED',
            paidAt: new Date(),
            method: payment_method?.type,
            cardLast4: payment_method?.card?.last4,
          },
        })

        // Обновить заказ
        await tx.order.update({
          where: { id: metadata.orderId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        })
      })
      break
    }

    case 'payment.canceled': {
      const { id, metadata } = event.object

      await db.payment.update({
        where: { externalId: id },
        data: { status: 'CANCELLED' },
      })
      break
    }

    case 'refund.succeeded': {
      const { payment_id } = event.object

      await db.payment.update({
        where: { externalId: payment_id },
        data: { status: 'REFUNDED' },
      })
      break
    }
  }

  return Response.json({ received: true })
}
```

## API создания платежа

```typescript
// app/api/orders/[id]/pay/route.ts
import { createPayment } from '@/lib/payment/yookassa'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { id } = await params
  const db = await getEnhancedPrisma()

  const order = await db.order.findUnique({
    where: { id, userId: session.user.id },
    include: { payment: true },
  })

  if (!order) {
    return Response.json({ error: 'Заказ не найден' }, { status: 404 })
  }

  if (order.status !== 'PENDING') {
    return Response.json({ error: 'Заказ уже оплачен' }, { status: 400 })
  }

  // Если платёж уже создан — вернуть его URL
  if (order.payment?.externalId) {
    const status = await getPaymentStatus(order.payment.externalId)
    if (status === 'pending') {
      return Response.json({
        redirectUrl: order.payment.confirmationUrl,
      })
    }
  }

  // Создать новый платёж
  const { confirmationUrl, paymentId } = await createPayment(order)

  await db.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      provider: 'YOOKASSA',
      externalId: paymentId,
      amount: order.total,
    },
    update: {
      externalId: paymentId,
      status: 'PENDING',
    },
  })

  return Response.json({ redirectUrl: confirmationUrl })
}
```

## Страница оплаты

```tsx
// app/orders/[id]/payment/page.tsx
'use client'

import { useOrder } from '@/app/_hooks/useOrders'
import { Alert, Button, Spinner, Text, VStack } from '@chakra-ui/react'
import { use, useEffect } from 'react'

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: order, isLoading } = useOrder(id)
  const [isPaying, setIsPaying] = useState(false)

  async function handlePay() {
    setIsPaying(true)
    try {
      const res = await fetch(`/api/orders/${id}/pay`, { method: 'POST' })
      const { redirectUrl, error } = await res.json()

      if (error) {
        alert(error)
        return
      }

      // Редирект на страницу оплаты
      window.location.href = redirectUrl
    } finally {
      setIsPaying(false)
    }
  }

  if (isLoading) { return <Spinner /> }

  if (order.status !== 'PENDING') {
    return (
      <Alert.Root status="info">
        <Alert.Title>Заказ уже оплачен</Alert.Title>
      </Alert.Root>
    )
  }

  return (
    <VStack gap={6}>
      <Text fontSize="2xl">Оплата заказа #{order.orderNumber}</Text>

      <VStack align="stretch" w="full" maxW="400px">
        <HStack justify="space-between">
          <Text>Товары</Text>
          <Text>{formatPrice(order.subtotal)}</Text>
        </HStack>
        <HStack justify="space-between">
          <Text>Доставка</Text>
          <Text>{order.shippingCost ? formatPrice(order.shippingCost) : 'Бесплатно'}</Text>
        </HStack>
        {order.discount > 0 && (
          <HStack justify="space-between" color="green.500">
            <Text>Скидка</Text>
            <Text>-{formatPrice(order.discount)}</Text>
          </HStack>
        )}
        <Separator />
        <HStack justify="space-between" fontWeight="bold" fontSize="xl">
          <Text>Итого</Text>
          <Text>{formatPrice(order.total)}</Text>
        </HStack>
      </VStack>

      <Button colorPalette="brand" size="lg" onClick={handlePay} loading={isPaying}>
        Оплатить
      </Button>

      <Text fontSize="sm" color="fg.muted">
        Безопасная оплата через ЮKassa
      </Text>
    </VStack>
  )
}
```

## Проверка статуса после оплаты

```tsx
// app/orders/[id]/status/page.tsx
'use client'

import { useOrder } from '@/app/_hooks/useOrders'
import { Alert, Spinner, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { use, useEffect } from 'react'

export default function PaymentStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: order, isLoading, refetch } = useOrder(id)

  // Polling для обновления статуса
  useEffect(() => {
    if (order?.status === 'PENDING') {
      const interval = setInterval(() => refetch(), 2000)
      return () => clearInterval(interval)
    }
  }, [order?.status, refetch])

  useEffect(() => {
    if (order?.status === 'PAID') {
      // Редирект на страницу успеха через 2 секунды
      setTimeout(() => router.push(`/orders/${id}`), 2000)
    }
  }, [order?.status, id, router])

  if (isLoading) { return <Spinner /> }

  if (order.status === 'PENDING') {
    return (
      <VStack gap={4}>
        <Spinner size="xl" />
        <Text>Ожидаем подтверждения оплаты...</Text>
      </VStack>
    )
  }

  if (order.status === 'PAID') {
    return (
      <Alert.Root status="success">
        <Alert.Title>Оплата прошла успешно!</Alert.Title>
        <Alert.Description>Перенаправляем вас на страницу заказа...</Alert.Description>
      </Alert.Root>
    )
  }

  return (
    <Alert.Root status="error">
      <Alert.Title>Ошибка оплаты</Alert.Title>
      <Alert.Description>Попробуйте оплатить заказ ещё раз</Alert.Description>
    </Alert.Root>
  )
}
```

## Безопасность

**NEVER:**

- Хранить полные данные карт в БД
- Логировать CVV или полные номера карт
- Передавать секретные ключи на клиент

**MUST:**

- Использовать HTTPS для всех запросов
- Валидировать webhook подписи/IP
- Хранить только last4 для отображения
- Использовать idempotency keys для предотвращения дублей
