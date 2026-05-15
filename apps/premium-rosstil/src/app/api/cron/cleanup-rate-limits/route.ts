import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

// Этот endpoint должен вызываться периодически (например, через Vercel Cron или системный cron)
export async function GET(request: Request) {
  // Проверка секретного токена (защита от несанкционированного доступа)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Удаление записей старше 7 дней
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const result = await prisma.loginAttempt.deleteMany({
      where: {
        updatedAt: {
          lt: sevenDaysAgo,
        },
      },
    })

    logger.info(`[Cron] Cleaned up ${result.count} old rate limit records`)

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    })
  } catch (error) {
    logger.error('[Cron] Cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
