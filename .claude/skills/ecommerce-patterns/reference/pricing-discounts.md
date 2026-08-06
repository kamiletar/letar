# Pricing & Discounts

## Модели

```zmodel
model Product {
  id           String   @id @default(cuid())
  price        Int      // Текущая цена (копейки)
  comparePrice Int?     // Старая цена для отображения скидки

  // Специальные цены
  salePrice    Int?
  saleStart    DateTime?
  saleEnd      DateTime?

  // Категория для групповых скидок
  categoryId   String?
  category     Category? @relation(...)
}

model PromoCode {
  id            String        @id @default(cuid())
  code          String        @unique
  type          DiscountType
  value         Int           // Процент или сумма в копейках
  minOrderAmount Int?         // Минимальная сумма заказа
  maxDiscount    Int?         // Максимальная скидка (для %)

  // Ограничения
  usageLimit    Int?          // Всего использований
  usageCount    Int           @default(0)
  perUserLimit  Int           @default(1)

  // Применимость
  categoryIds   String[]      // К каким категориям
  productIds    String[]      // К каким товарам
  excludeProductIds String[]  // Исключения

  isActive      Boolean       @default(true)
  startsAt      DateTime      @default(now())
  expiresAt     DateTime?

  usages        PromoCodeUsage[]

  @@allow('read', auth().role == 'ADMIN')
  @@allow('all', auth().role == 'ADMIN')
}

model PromoCodeUsage {
  id          String    @id @default(cuid())
  promoCodeId String
  promoCode   PromoCode @relation(fields: [promoCodeId], references: [id])
  userId      String
  orderId     String?
  discount    Int       // Фактическая скидка
  createdAt   DateTime  @default(now())

  @@unique([promoCodeId, userId, orderId])
}

enum DiscountType {
  PERCENTAGE  // Процент от суммы
  FIXED       // Фиксированная сумма
  FREE_SHIPPING // Бесплатная доставка
}
```

## Расчёт цены

```typescript
// lib/pricing/calculate.ts

interface PriceResult {
  original: number // Оригинальная цена
  current: number // Текущая цена (с учётом sale)
  discount: number // Скидка по промокоду
  shipping: number // Доставка
  total: number // Итого
  savings: number // Общая экономия
}

export function calculateItemPrice(product: Product): number {
  const now = new Date()

  // Проверить активную распродажу
  if (
    product.salePrice
    && product.saleStart
    && product.saleStart <= now
    && (!product.saleEnd || product.saleEnd >= now)
  ) {
    return product.salePrice
  }

  return product.price
}

export async function calculateOrderTotal(
  items: { productId: string; quantity: number }[],
  promoCode?: string,
  userId?: string,
): Promise<PriceResult> {
  const db = await getEnhancedPrisma()

  // Получить товары
  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  })

  // Рассчитать сумму товаров
  let subtotal = 0
  let originalTotal = 0

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) continue

    const currentPrice = calculateItemPrice(product)
    subtotal += currentPrice * item.quantity
    originalTotal += product.price * item.quantity
  }

  // Применить промокод
  let discount = 0
  let freeShipping = false

  if (promoCode && userId) {
    const promo = await validatePromoCode(promoCode, subtotal, userId, items)
    if (promo.valid) {
      discount = promo.discount
      freeShipping = promo.freeShipping
    }
  }

  // Рассчитать доставку
  const shipping = freeShipping || subtotal >= 500000 ? 0 : 35000

  const total = subtotal - discount + shipping
  const savings = originalTotal - subtotal + discount + (freeShipping ? 35000 : 0)

  return {
    original: originalTotal,
    current: subtotal,
    discount,
    shipping,
    total,
    savings,
  }
}
```

## Валидация промокода

```typescript
// lib/pricing/promo.ts

interface PromoValidation {
  valid: boolean
  error?: string
  discount: number
  freeShipping: boolean
}

export async function validatePromoCode(
  code: string,
  subtotal: number,
  userId: string,
  items: { productId: string; quantity: number }[],
): Promise<PromoValidation> {
  const db = await getEnhancedPrisma()
  const now = new Date()

  // Найти промокод
  const promo = await db.promoCode.findUnique({ where: { code } })

  if (!promo) {
    return { valid: false, error: 'Промокод не найден', discount: 0, freeShipping: false }
  }

  // Проверки активности
  if (!promo.isActive) {
    return { valid: false, error: 'Промокод неактивен', discount: 0, freeShipping: false }
  }

  if (promo.startsAt > now) {
    return { valid: false, error: 'Промокод ещё не активен', discount: 0, freeShipping: false }
  }

  if (promo.expiresAt && promo.expiresAt < now) {
    return { valid: false, error: 'Промокод истёк', discount: 0, freeShipping: false }
  }

  // Проверка лимитов использования
  if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
    return { valid: false, error: 'Лимит использования исчерпан', discount: 0, freeShipping: false }
  }

  // Проверка использования пользователем
  const userUsages = await db.promoCodeUsage.count({
    where: { promoCodeId: promo.id, userId },
  })

  if (userUsages >= promo.perUserLimit) {
    return { valid: false, error: 'Вы уже использовали этот промокод', discount: 0, freeShipping: false }
  }

  // Проверка минимальной суммы
  if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
    return {
      valid: false,
      error: `Минимальная сумма заказа: ${(promo.minOrderAmount / 100).toFixed(0)} ₽`,
      discount: 0,
      freeShipping: false,
    }
  }

  // Проверка применимости к товарам
  const applicableAmount = await calculateApplicableAmount(promo, items)

  if (applicableAmount === 0) {
    return { valid: false, error: 'Промокод не применим к товарам в корзине', discount: 0, freeShipping: false }
  }

  // Рассчитать скидку
  let discount = 0
  let freeShipping = false

  switch (promo.type) {
    case 'PERCENTAGE':
      discount = Math.floor((applicableAmount * promo.value) / 100)
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount)
      }
      break

    case 'FIXED':
      discount = Math.min(promo.value, applicableAmount)
      break

    case 'FREE_SHIPPING':
      freeShipping = true
      break
  }

  return { valid: true, discount, freeShipping }
}

async function calculateApplicableAmount(
  promo: PromoCode,
  items: { productId: string; quantity: number }[],
): Promise<number> {
  const db = await getEnhancedPrisma()

  // Если нет ограничений — применяется ко всему
  if (!promo.productIds.length && !promo.categoryIds.length) {
    const products = await db.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        NOT: { id: { in: promo.excludeProductIds } },
      },
    })

    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)
      return sum + (product ? calculateItemPrice(product) * item.quantity : 0)
    }, 0)
  }

  // Фильтр по товарам/категориям
  const products = await db.product.findMany({
    where: {
      id: { in: items.map((i) => i.productId) },
      OR: [{ id: { in: promo.productIds } }, { categoryId: { in: promo.categoryIds } }],
      NOT: { id: { in: promo.excludeProductIds } },
    },
  })

  return items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product ? calculateItemPrice(product) * item.quantity : 0)
  }, 0)
}
```

## API промокодов

```typescript
// app/api/promo/validate/route.ts
export async function POST(request: Request) {
  const session = await auth()
  const { code, items } = await request.json()

  // Рассчитать текущую сумму
  const db = await getEnhancedPrisma()
  const products = await db.product.findMany({
    where: { id: { in: items.map((i: any) => i.productId) } },
  })

  const subtotal = items.reduce((sum: number, item: any) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product ? calculateItemPrice(product) * item.quantity : 0)
  }, 0)

  const result = await validatePromoCode(code, subtotal, session?.user?.id || 'guest', items)

  return Response.json(result)
}
```

## Компонент ввода промокода

```tsx
'use client'

import { Alert, Button, HStack, Input, Text } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

interface PromoInputProps {
  items: { productId: string; quantity: number }[]
  onApply: (discount: number, freeShipping: boolean) => void
}

export function PromoCodeInput({ items, onApply }: PromoInputProps) {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null)

  const validate = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, items }),
      })
      return res.json()
    },
    onSuccess: (result) => {
      if (result.valid) {
        setApplied({ code, discount: result.discount })
        onApply(result.discount, result.freeShipping)
      }
    },
  })

  if (applied) {
    return (
      <Alert.Root status="success">
        <Alert.Title>Промокод {applied.code} применён</Alert.Title>
        <Alert.Description>Скидка: {(applied.discount / 100).toFixed(0)} ₽</Alert.Description>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setApplied(null)
            setCode('')
            onApply(0, false)
          }}
        >
          Отменить
        </Button>
      </Alert.Root>
    )
  }

  return (
    <VStack align="stretch" gap={2}>
      <HStack>
        <Input placeholder="Промокод" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Button onClick={() => validate.mutate(code)} loading={validate.isPending} disabled={!code}>
          Применить
        </Button>
      </HStack>

      {validate.data && !validate.data.valid && (
        <Text color="red.500" fontSize="sm">
          {validate.data.error}
        </Text>
      )}
    </VStack>
  )
}
```

## Отображение цен

```tsx
// components/ProductPrice.tsx
interface ProductPriceProps {
  price: number
  comparePrice?: number | null
  salePrice?: number | null
  saleEnd?: Date | null
}

export function ProductPrice({ price, comparePrice, salePrice, saleEnd }: ProductPriceProps) {
  const currentPrice = salePrice || price
  const originalPrice = comparePrice || (salePrice ? price : null)
  const discount = originalPrice ? Math.round((1 - currentPrice / originalPrice) * 100) : 0

  return (
    <VStack align="start" gap={1}>
      <HStack>
        <Text fontSize="xl" fontWeight="bold">
          {formatPrice(currentPrice)}
        </Text>
        {originalPrice && (
          <>
            <Text fontSize="sm" textDecoration="line-through" color="fg.muted">
              {formatPrice(originalPrice)}
            </Text>
            <Badge colorPalette="red">-{discount}%</Badge>
          </>
        )}
      </HStack>

      {saleEnd && (
        <Text fontSize="xs" color="red.500">
          Акция до {formatDate(saleEnd)}
        </Text>
      )}
    </VStack>
  )
}

function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}
```

## Правила

- **MUST** хранить все цены в копейках (Int)
- **MUST** валидировать промокод на сервере
- **SHOULD** показывать экономию пользователю
- **SHOULD** ограничивать использование промокодов на пользователя
- **NEVER** доверять ценам с клиента — пересчитывать на сервере
