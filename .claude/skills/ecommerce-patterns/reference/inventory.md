# Inventory Management

## Модели инвентаря

```zmodel
model Product {
  id          String        @id @default(cuid())
  name        String
  sku         String        @unique // Артикул
  price       Int           // Цена в копейках
  comparePrice Int?         // Старая цена (для скидок)
  stock       Int           @default(0)
  lowStockThreshold Int     @default(5)

  // Варианты
  variants    ProductVariant[]

  // Отслеживание изменений
  stockHistory StockHistory[]

  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@allow('read', true)
  @@allow('all', auth().role == 'ADMIN')
}

model ProductVariant {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  size        String?
  color       String?
  sku         String   @unique
  stock       Int      @default(0)
  priceDelta  Int      @default(0) // +/- к базовой цене

  @@unique([productId, size, color])
  @@allow('read', true)
  @@allow('all', auth().role == 'ADMIN')
}

model StockHistory {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  variantId   String?

  action      StockAction
  quantity    Int      // Изменение (+ или -)
  reason      String?
  reference   String?  // ID заказа или поставки

  createdAt   DateTime @default(now())
  createdBy   String?

  @@allow('read', auth().role == 'ADMIN')
  @@allow('create', auth().role == 'ADMIN')
}

enum StockAction {
  RECEIVED    // Поступление
  SOLD        // Продажа
  RETURNED    // Возврат
  ADJUSTED    // Корректировка
  RESERVED    // Резерв
  RELEASED    // Снятие резерва
}
```

## API управления складом

```typescript
// app/api/admin/inventory/[productId]/route.ts
export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return Response.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const { productId } = await params
  const { action, quantity, reason, variantId } = await request.json()
  const db = await getEnhancedPrisma()

  // Определить изменение количества
  const delta = ['RECEIVED', 'RETURNED', 'RELEASED'].includes(action) ? quantity : -quantity

  await db.$transaction(async (tx) => {
    // Обновить остаток
    if (variantId) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: delta } },
      })
    } else {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } },
      })
    }

    // Записать в историю
    await tx.stockHistory.create({
      data: {
        productId,
        variantId,
        action,
        quantity: delta,
        reason,
        createdBy: session.user.id,
      },
    })
  })

  return Response.json({ success: true })
}
```

## Проверка наличия при заказе

```typescript
// lib/inventory/check-availability.ts
export async function checkAvailability(
  items: { productId: string; variantId?: string; quantity: number }[],
): Promise<{ available: boolean; unavailable: string[] }> {
  const db = await getEnhancedPrisma()
  const unavailable: string[] = []

  for (const item of items) {
    if (item.variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { name: true } } },
      })

      if (!variant || variant.stock < item.quantity) {
        unavailable.push(`${variant?.product.name} (${variant?.size || ''} ${variant?.color || ''})`)
      }
    } else {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { name: true, stock: true },
      })

      if (!product || product.stock < item.quantity) {
        unavailable.push(product?.name || item.productId)
      }
    }
  }

  return {
    available: unavailable.length === 0,
    unavailable,
  }
}
```

## Резервирование товара

```typescript
// lib/inventory/reserve.ts
export async function reserveStock(
  orderId: string,
  items: { productId: string; variantId?: string; quantity: number }[],
) {
  const db = await getEnhancedPrisma()

  await db.$transaction(async (tx) => {
    for (const item of items) {
      // Проверить наличие
      const stock = item.variantId
        ? (await tx.productVariant.findUnique({ where: { id: item.variantId } }))?.stock
        : (await tx.product.findUnique({ where: { id: item.productId } }))?.stock

      if (!stock || stock < item.quantity) {
        throw new Error(`Недостаточно товара`)
      }

      // Уменьшить остаток
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Записать в историю
      await tx.stockHistory.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          action: 'RESERVED',
          quantity: -item.quantity,
          reference: orderId,
        },
      })
    }
  })
}

export async function releaseStock(orderId: string) {
  const db = await getEnhancedPrisma()

  // Найти все резервы по заказу
  const reservations = await db.stockHistory.findMany({
    where: { reference: orderId, action: 'RESERVED' },
  })

  await db.$transaction(async (tx) => {
    for (const res of reservations) {
      const quantity = Math.abs(res.quantity)

      if (res.variantId) {
        await tx.productVariant.update({
          where: { id: res.variantId },
          data: { stock: { increment: quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: res.productId },
          data: { stock: { increment: quantity } },
        })
      }

      await tx.stockHistory.create({
        data: {
          productId: res.productId,
          variantId: res.variantId,
          action: 'RELEASED',
          quantity,
          reference: orderId,
        },
      })
    }
  })
}
```

## Уведомления о низком остатке

```typescript
// lib/inventory/alerts.ts
export async function checkLowStock() {
  const db = await getEnhancedPrisma()

  const lowStockProducts = await db.product.findMany({
    where: {
      isActive: true,
      stock: { lte: db.product.fields.lowStockThreshold },
    },
    select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
  })

  const lowStockVariants = await db.productVariant.findMany({
    where: {
      product: { isActive: true },
      stock: { lte: 3 },
    },
    include: { product: { select: { name: true } } },
  })

  if (lowStockProducts.length > 0 || lowStockVariants.length > 0) {
    await sendLowStockAlert({
      products: lowStockProducts,
      variants: lowStockVariants,
    })
  }

  return { products: lowStockProducts, variants: lowStockVariants }
}

// Запуск через cron или при каждом изменении
// В Next.js можно через Vercel Cron или отдельный сервис
```

## Компонент отображения наличия

```tsx
'use client'

import { Badge, HStack, Text } from '@chakra-ui/react'

interface StockBadgeProps {
  stock: number
  lowThreshold?: number
}

export function StockBadge({ stock, lowThreshold = 5 }: StockBadgeProps) {
  if (stock === 0) {
    return <Badge colorPalette="red">Нет в наличии</Badge>
  }

  if (stock <= lowThreshold) {
    return (
      <HStack>
        <Badge colorPalette="yellow">Мало</Badge>
        <Text fontSize="sm" color="fg.muted">
          Осталось: {stock}
        </Text>
      </HStack>
    )
  }

  return <Badge colorPalette="green">В наличии</Badge>
}
```

## Админ-панель инвентаря

```tsx
'use client'

import { useProducts, useUpdateStock } from '@/app/_hooks/useInventory'
import { Button, HStack, Input, Select, Table, VStack } from '@chakra-ui/react'

export function InventoryTable() {
  const { data: products } = useProducts()
  const updateStock = useUpdateStock()
  const [adjustment, setAdjustment] = useState<Record<string, number>>({})

  async function handleAdjust(productId: string, action: 'RECEIVED' | 'ADJUSTED') {
    const quantity = adjustment[productId]
    if (!quantity) return

    await updateStock.mutateAsync({ productId, action, quantity })
    setAdjustment((prev) => ({ ...prev, [productId]: 0 }))
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Артикул</Table.ColumnHeader>
          <Table.ColumnHeader>Название</Table.ColumnHeader>
          <Table.ColumnHeader>Остаток</Table.ColumnHeader>
          <Table.ColumnHeader>Корректировка</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {products?.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>{product.sku}</Table.Cell>
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>
              <StockBadge stock={product.stock} />
            </Table.Cell>
            <Table.Cell>
              <HStack>
                <Input
                  type="number"
                  w="80px"
                  value={adjustment[product.id] || ''}
                  onChange={(e) =>
                    setAdjustment((prev) => ({
                      ...prev,
                      [product.id]: parseInt(e.target.value) || 0,
                    }))}
                />
                <Button size="sm" onClick={() => handleAdjust(product.id, 'RECEIVED')}>
                  Приход
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAdjust(product.id, 'ADJUSTED')}>
                  Списать
                </Button>
              </HStack>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}
```

## Правила

- **MUST** использовать транзакции для изменения остатков
- **MUST** записывать историю всех изменений
- **SHOULD** проверять наличие перед резервированием
- **SHOULD** уведомлять о низком остатке
- **NEVER** разрешать отрицательные остатки без явного флага
