import { getPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * Cron: перевод средств из pending в available после истечения protection period.
 *
 * Логика:
 * 1. Найти SubOrders со статусом DELIVERED и protectionEndsAt < now()
 * 2. Перевести статус в COMPLETED
 * 3. Перенести sellerAmount из pendingAmount в availableAmount в SellerBalance
 *
 * Запуск: GET /api/cron/process-payouts?secret=CRON_SECRET
 * Рекомендуемый интервал: каждые 6 часов
 */
export async function GET(request: Request) {
  // Проверка секретного токена
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getPrisma()
  const now = new Date()
  let processedCount = 0

  try {
    // Найти подзаказы с истёкшим protection period
    const expiredSubOrders = await db.subOrder.findMany({
      where: {
        status: 'DELIVERED',
        protectionEndsAt: { lt: now },
      },
      select: {
        id: true,
        sellerId: true,
        sellerAmount: true,
      },
    })

    if (expiredSubOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет подзаказов для обработки',
        processedCount: 0,
      })
    }

    // Обработать каждый подзаказ
    for (const subOrder of expiredSubOrders) {
      try {
        await db.$transaction(async (tx) => {
          // SubOrder → COMPLETED
          await tx.subOrder.update({
            where: { id: subOrder.id },
            data: { status: 'COMPLETED' },
          })

          const sellerAmount = Number(subOrder.sellerAmount)

          // SellerBalance: pending → available
          await tx.sellerBalance.update({
            where: { sellerId: subOrder.sellerId },
            data: {
              pendingAmount: { decrement: sellerAmount },
              availableAmount: { increment: sellerAmount },
            },
          })
        })

        processedCount++
      } catch (error) {
        console.error(`[Cron] Ошибка обработки SubOrder ${subOrder.id}:`, error)
      }
    }

    console.warn(`[Cron] Обработано подзаказов: ${processedCount}/${expiredSubOrders.length}`)

    return NextResponse.json({
      success: true,
      processedCount,
      totalFound: expiredSubOrders.length,
    })
  } catch (error) {
    console.error('[Cron] Ошибка process-payouts:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
