import { getPrisma } from '@/lib/db'
import { buildProductUrl, sendStockNotificationEmail } from '@/lib/stock-notifications'
import { NextResponse } from 'next/server'

/**
 * Cron: отправка уведомлений о поступлении товара.
 *
 * Логика:
 * 1. Найти StockNotification, где notified=false
 * 2. Проверить, что соответствующий ProductItem имеет availableCount > 0
 * 3. Отправить email подписчикам
 * 4. Отметить notified=true
 *
 * Запуск: GET /api/cron/stock-notifications?secret=CRON_SECRET
 * Рекомендуемый интервал: каждые 30 минут
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getPrisma()
  let sentCount = 0

  try {
    // Найти активные подписки с товаром, который теперь в наличии
    const pendingNotifications = await db.stockNotification.findMany({
      where: {
        notified: false,
        productItem: {
          availableCount: { gt: 0 },
        },
      },
      include: {
        productItem: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true },
                },
              },
            },
            size: {
              select: { international: true },
            },
          },
        },
      },
    })

    if (pendingNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет подписок для уведомления',
        sentCount: 0,
      })
    }

    for (const notification of pendingNotifications) {
      try {
        const { productItem } = notification
        const product = productItem.variant.product

        await sendStockNotificationEmail({
          email: notification.email,
          productName: product.name,
          variantColor: productItem.variant.color,
          sizeName: productItem.size.international,
          productUrl: buildProductUrl(product.id),
        })

        // Отметить как отправленное
        await db.stockNotification.update({
          where: { id: notification.id },
          data: {
            notified: true,
            notifiedAt: new Date(),
          },
        })

        sentCount++
      } catch (error) {
        console.error(`[Cron] Ошибка уведомления ${notification.id}:`, error)
      }
    }

    console.warn(`[Cron] Отправлено уведомлений: ${sentCount}/${pendingNotifications.length}`)

    return NextResponse.json({
      success: true,
      sentCount,
      totalFound: pendingNotifications.length,
    })
  } catch (error) {
    console.error('[Cron] Ошибка stock-notifications:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
