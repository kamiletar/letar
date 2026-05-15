import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { SellerDashboardClient } from './seller-dashboard-client'

/**
 * Главная страница панели продавца — обзор статистики.
 */
export default async function SellerPage() {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  // Найти Seller текущего пользователя
  const seller = await db.seller.findUnique({
    where: { userId: user.id },
    select: { id: true, shopName: true, averageRating: true, reviewCount: true },
  })

  if (!seller) {
    return <div>Профиль продавца не найден. Обратитесь к администратору.</div>
  }

  // Статистика параллельно
  const [productCount, totalOrders, newOrders, balance] = await Promise.all([
    db.product.count({ where: { sellerId: seller.id } }),
    db.subOrder.count({ where: { sellerId: seller.id } }),
    db.subOrder.count({ where: { sellerId: seller.id, status: 'PAID' } }),
    db.sellerBalance.findUnique({
      where: { sellerId: seller.id },
      select: { availableAmount: true, pendingAmount: true, reservedAmount: true },
    }),
  ])

  return (
    <SellerDashboardClient
      shopName={seller.shopName}
      productCount={productCount}
      totalOrders={totalOrders}
      newOrders={newOrders}
      availableAmount={Number(balance?.availableAmount ?? 0)}
      pendingAmount={Number(balance?.pendingAmount ?? 0)}
      averageRating={seller.averageRating}
      reviewCount={seller.reviewCount}
    />
  )
}
