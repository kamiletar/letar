import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import packageJson from '../../../../package.json'
import { AdminDashboardClient } from './admin-dashboard-client'

export default async function AdminPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Fetch data in parallel
  const [
    userCount,
    productCount,
    productSizeCount,
    categoryCount,
    customOrderCount,
    newCustomOrderCount,
    orderCount,
    newOrderCount,
    imageCount,
    sellerCount,
    pendingApplicationCount,
    totalCommission,
    pendingReturnCount,
    reviewCount,
    hiddenReviewCount,
    activePromoCount,
    pendingStockNotificationCount,
    loyaltyMemberCount,
    recentUsers,
    recentProducts,
  ] = await Promise.all([
    db.user.count(),
    db.product.count(),
    db.productSize.count(),
    db.category.count(),
    db.customOrder.count(),
    db.customOrder.count({ where: { status: 'NEW' } }),
    db.order.count(),
    db.order.count({ where: { status: 'NEW' } }),
    db.image.count(),
    db.seller.count(),
    db.sellerApplication.count({ where: { status: 'PENDING' } }),
    db.subOrder.aggregate({
      _sum: { commissionAmount: true },
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
    }),
    db.return.count({ where: { status: 'REQUESTED' as never } }),
    (db.review as any).count(),
    (db.review as any).count({ where: { status: 'HIDDEN' } }),
    db.promo.count({ where: { isActive: true } }),
    db.stockNotification.count({ where: { notified: false } }),
    db.loyaltyAccount.count(),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    db.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true },
    }),
  ])

  return (
    <AdminDashboardClient
      userCount={userCount}
      productCount={productCount}
      productSizeCount={productSizeCount}
      categoryCount={categoryCount}
      customOrderCount={customOrderCount}
      newCustomOrderCount={newCustomOrderCount}
      orderCount={orderCount}
      newOrderCount={newOrderCount}
      imageCount={imageCount}
      sellerCount={sellerCount}
      pendingApplicationCount={pendingApplicationCount}
      totalCommission={Number(totalCommission._sum.commissionAmount || 0)}
      pendingReturnCount={pendingReturnCount}
      reviewCount={reviewCount}
      hiddenReviewCount={hiddenReviewCount}
      activePromoCount={activePromoCount}
      pendingStockNotificationCount={pendingStockNotificationCount}
      loyaltyMemberCount={loyaltyMemberCount}
      recentUsers={recentUsers}
      recentProducts={recentProducts}
      version={packageJson.version}
    />
  )
}
