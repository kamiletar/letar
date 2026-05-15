# Cart Patterns

## Структура корзины

```zmodel
model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  updatedAt DateTime   @updatedAt

  @@allow('read,create,update,delete', auth() == user)
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int      @default(1)
  size      String?  // Размер (для одежды)
  color     String?  // Цвет

  @@unique([cartId, productId, size, color])
  @@allow('all', cart.user == auth())
}
```

## API операции

```typescript
// app/api/cart/route.ts
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const db = await getEnhancedPrisma()
  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, images: true },
          },
        },
      },
    },
  })

  return Response.json(cart)
}
```

## Добавление товара

```typescript
// app/api/cart/items/route.ts
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { productId, quantity = 1, size, color } = await request.json()
  const db = await getEnhancedPrisma()

  // Найти или создать корзину
  const cart = await db.cart.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  })

  // Проверить наличие товара
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  })

  if (!product || product.stock < quantity) {
    return Response.json({ error: 'Недостаточно товара' }, { status: 400 })
  }

  // Добавить или обновить позицию
  const item = await db.cartItem.upsert({
    where: {
      cartId_productId_size_color: { cartId: cart.id, productId, size, color },
    },
    create: { cartId: cart.id, productId, quantity, size, color },
    update: { quantity: { increment: quantity } },
  })

  return Response.json(item)
}
```

## Хук для корзины

```typescript
// app/_hooks/useCart.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await fetch('/api/cart')
      if (!res.ok) throw new Error('Ошибка загрузки корзины')
      return res.json()
    },
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { productId: string; quantity?: number; size?: string; color?: string }) => {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Ошибка добавления')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Ошибка удаления')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
```

## Компонент корзины

```tsx
'use client'

import { useCart, useRemoveFromCart, useUpdateCartItem } from '@/app/_hooks/useCart'
import { Box, Button, HStack, IconButton, Image, Text, VStack } from '@chakra-ui/react'
import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi'

export function CartDrawer() {
  const { data: cart, isLoading } = useCart()
  const removeItem = useRemoveFromCart()
  const updateItem = useUpdateCartItem()

  if (isLoading) return <Spinner />
  if (!cart?.items?.length) return <Text>Корзина пуста</Text>

  const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <VStack gap={4} align="stretch">
      {cart.items.map((item) => (
        <HStack key={item.id} gap={4}>
          <Image
            src={`/api/images/${item.product.images[0]?.id}`}
            alt={item.product.name}
            boxSize="80px"
            objectFit="cover"
          />
          <Box flex={1}>
            <Text fontWeight="medium">{item.product.name}</Text>
            {item.size && <Text fontSize="sm">Размер: {item.size}</Text>}
            <Text>{(item.product.price / 100).toFixed(2)} ₽</Text>
          </Box>
          <HStack>
            <IconButton
              aria-label="Уменьшить"
              icon={<FiMinus />}
              size="sm"
              onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}
              disabled={item.quantity <= 1}
            />
            <Text>{item.quantity}</Text>
            <IconButton
              aria-label="Увеличить"
              icon={<FiPlus />}
              size="sm"
              onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}
            />
            <IconButton
              aria-label="Удалить"
              icon={<FiTrash2 />}
              size="sm"
              colorPalette="red"
              onClick={() => removeItem.mutate(item.id)}
            />
          </HStack>
        </HStack>
      ))}

      <Separator />

      <HStack justify="space-between">
        <Text fontWeight="bold">Итого:</Text>
        <Text fontWeight="bold">{(total / 100).toFixed(2)} ₽</Text>
      </HStack>

      <Button colorPalette="brand" size="lg">
        Оформить заказ
      </Button>
    </VStack>
  )
}
```

## Оптимистичное обновление

```typescript
export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const res = await fetch(`/api/cart/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      if (!res.ok) throw new Error('Ошибка обновления')
      return res.json()
    },
    // Оптимистичное обновление
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const previousCart = queryClient.getQueryData(['cart'])

      queryClient.setQueryData(['cart'], (old: any) => ({
        ...old,
        items: old.items.map((item: any) => (item.id === id ? { ...item, quantity } : item)),
      }))

      return { previousCart }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['cart'], context?.previousCart)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
```

## Локальная корзина (для гостей)

```typescript
// lib/local-cart.ts
const CART_KEY = 'guest_cart'

interface LocalCartItem {
  productId: string
  quantity: number
  size?: string
  color?: string
}

export function getLocalCart(): LocalCartItem[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(CART_KEY)
  return data ? JSON.parse(data) : []
}

export function addToLocalCart(item: LocalCartItem) {
  const cart = getLocalCart()
  const existing = cart.find((i) => i.productId === item.productId && i.size === item.size && i.color === item.color)

  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push(item)
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

// Синхронизация при авторизации
export async function syncLocalCartWithServer() {
  const localCart = getLocalCart()
  if (!localCart.length) return

  await Promise.all(
    localCart.map((item) =>
      fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
    )
  )

  localStorage.removeItem(CART_KEY)
}
```
