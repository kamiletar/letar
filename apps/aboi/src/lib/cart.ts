'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { auth } from './auth'
import { prismaAuth } from './prisma'

export interface CartActionResult {
  ok: boolean
  error?: string
}

export interface CartLineView {
  id: string
  productId: string
  productName: string
  productSlug: string
  productImagePath: string | null
  lengthMeters: number
  unitPrice: number
  total: number
}

export interface CartView {
  id: string | null
  itemsTotal: number
  itemCount: number
  items: CartLineView[]
}

const CART_TTL_DAYS = 30

/**
 * Возвращает текущего пользователя — реального или anonymous (создаёт через Better Auth
 * `signInAnonymous` если сессии нет). Возвращённый id безопасно использовать как Cart.userId.
 */
async function getOrCreateSessionUserId(): Promise<string> {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })

  if (session?.user) {
    return session.user.id
  }

  // Гость без сессии — создаём anonymous через Better Auth.
  // signInAnonymous возвращает headers со Set-Cookie, но в server action они проксируются автоматически
  // через nextCookies plugin (см. lib/auth.ts).
  const result = await auth.api.signInAnonymous({ headers: reqHeaders, asResponse: false })
  if (!result?.user) {
    throw new Error('Не удалось создать гостевую сессию')
  }
  return result.user.id
}

/**
 * Находит активную корзину пользователя или создаёт новую. Используется внутри других actions —
 * не экспортируется как Server Action из-за частоты вызовов.
 */
async function ensureCart(userId: string): Promise<{ id: string }> {
  const existing = await prismaAuth.cart.findUnique({ where: { userId }, select: { id: true } })
  if (existing) return existing

  const expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000)
  return prismaAuth.cart.create({
    data: { userId, expiresAt },
    select: { id: true },
  })
}

/**
 * Server action: добавить товар в корзину. Если товар уже в корзине —
 * увеличивает lengthMeters. unitPrice фиксируется снэпшотом из Product.pricePerMeter.
 */
export async function addToCartAction(productId: string, lengthMeters: number): Promise<CartActionResult> {
  if (!(lengthMeters > 0)) return { ok: false, error: 'Длина должна быть больше 0' }

  const userId = await getOrCreateSessionUserId()
  const cart = await ensureCart(userId)

  // Берём свежую цену + проверяем что товар опубликован
  const product = await prismaAuth.product.findFirst({
    where: { id: productId, published: true, deletedAt: null },
    select: { id: true, pricePerMeter: true, minLengthMeters: true },
  })
  if (!product) return { ok: false, error: 'Товар не найден или снят с продажи' }

  const minLen = Number(product.minLengthMeters)
  if (lengthMeters < minLen) {
    return { ok: false, error: `Минимальная длина — ${minLen.toFixed(1)} м` }
  }

  const existing = await prismaAuth.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  })

  if (existing) {
    await prismaAuth.cartItem.update({
      where: { id: existing.id },
      data: { lengthMeters: Number(existing.lengthMeters) + lengthMeters },
    })
  } else {
    await prismaAuth.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        lengthMeters,
        unitPrice: product.pricePerMeter,
      },
    })
  }

  revalidatePath('/cart')
  return { ok: true }
}

export async function updateCartItemAction(itemId: string, lengthMeters: number): Promise<CartActionResult> {
  if (!(lengthMeters > 0)) return { ok: false, error: 'Длина должна быть больше 0' }

  const userId = await getOrCreateSessionUserId()
  const item = await prismaAuth.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: { select: { userId: true } }, product: { select: { minLengthMeters: true } } },
  })
  if (!item || item.cart.userId !== userId) return { ok: false, error: 'Не найдено' }

  const minLen = Number(item.product.minLengthMeters)
  if (lengthMeters < minLen) {
    return { ok: false, error: `Минимальная длина — ${minLen.toFixed(1)} м` }
  }

  await prismaAuth.cartItem.update({ where: { id: itemId }, data: { lengthMeters } })
  revalidatePath('/cart')
  return { ok: true }
}

export async function removeFromCartAction(itemId: string): Promise<CartActionResult> {
  const userId = await getOrCreateSessionUserId()
  const item = await prismaAuth.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: { select: { userId: true } } },
  })
  if (!item || item.cart.userId !== userId) return { ok: false, error: 'Не найдено' }

  await prismaAuth.cartItem.delete({ where: { id: itemId } })
  revalidatePath('/cart')
  return { ok: true }
}

export async function clearCartAction(): Promise<CartActionResult> {
  const userId = await getOrCreateSessionUserId()
  const cart = await prismaAuth.cart.findUnique({ where: { userId }, select: { id: true } })
  if (!cart) return { ok: true }

  await prismaAuth.cartItem.deleteMany({ where: { cartId: cart.id } })
  revalidatePath('/cart')
  return { ok: true }
}

/**
 * Server action: возвращает агрегированный view корзины для UI.
 * НЕ создаёт anonymous-сессию, если её нет — возвращает пустую корзину.
 * Это важно: чтение Header счётчика на каждой странице не должно плодить anon-юзеров.
 */
export async function getCartViewAction(): Promise<CartView> {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) {
    return { id: null, itemsTotal: 0, itemCount: 0, items: [] }
  }

  const cart = await prismaAuth.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
                include: { image: { select: { path: true } } },
              },
            },
          },
        },
      },
    },
  })

  if (!cart) {
    return { id: null, itemsTotal: 0, itemCount: 0, items: [] }
  }

  const items: CartLineView[] = cart.items.map((it) => {
    const length = Number(it.lengthMeters)
    const total = Math.round(length * it.unitPrice)
    return {
      id: it.id,
      productId: it.productId,
      productName: it.product.name,
      productSlug: it.product.slug,
      productImagePath: it.product.images[0]?.image.path ?? null,
      lengthMeters: length,
      unitPrice: it.unitPrice,
      total,
    }
  })

  return {
    id: cart.id,
    itemCount: items.length,
    itemsTotal: items.reduce((sum, i) => sum + i.total, 0),
    items,
  }
}
