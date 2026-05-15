import { prismaAuth } from './prisma'

/**
 * Переносит данные anonymous-юзера на нового зарегистрированного.
 * Вызывается из Better Auth `anonymous` плагина в `onLinkAccount`.
 *
 * На E1 anonymous-юзер хранит только Address и ConsentLog (Cart/Wishlist
 * появятся в E3/E5 — расширим хук).
 *
 * Anonymous user удаляется Better Auth автоматически после линковки.
 */
export async function mergeAnonymousAccount(anonymousUserId: string, newUserId: string): Promise<void> {
  if (anonymousUserId === newUserId) return

  await prismaAuth.address.updateMany({
    where: { userId: anonymousUserId },
    data: { userId: newUserId },
  })

  await prismaAuth.consentLog.updateMany({
    where: { userId: anonymousUserId },
    data: { userId: newUserId },
  })

  // Корзина: anonymous-юзер мог положить товары; объединяем с существующей user-корзиной.
  // Стратегия: MergeWithExistingCustomerCart — для одинаковых productId суммируем lengthMeters.
  const anonCart = await prismaAuth.cart.findUnique({
    where: { userId: anonymousUserId },
    include: { items: true },
  })
  if (!anonCart || anonCart.items.length === 0) {
    if (anonCart) await prismaAuth.cart.delete({ where: { id: anonCart.id } })
    return
  }

  const userCart = await prismaAuth.cart.findUnique({ where: { userId: newUserId } })

  if (!userCart) {
    // У нового юзера корзины ещё нет — просто перевешиваем ownership
    await prismaAuth.cart.update({
      where: { id: anonCart.id },
      data: { userId: newUserId },
    })
    return
  }

  // Обе корзины существуют — объединяем item за item
  for (const item of anonCart.items) {
    const existing = await prismaAuth.cartItem.findUnique({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
    })
    if (existing) {
      await prismaAuth.cartItem.update({
        where: { id: existing.id },
        data: { lengthMeters: Number(existing.lengthMeters) + Number(item.lengthMeters) },
      })
    } else {
      await prismaAuth.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          lengthMeters: item.lengthMeters,
          unitPrice: item.unitPrice,
        },
      })
    }
  }

  await prismaAuth.cart.delete({ where: { id: anonCart.id } })
}
