import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Временный endpoint для сброса rate limit (только для разработки!)
 * DELETE /api/auth/reset-rate-limit?email=user@example.com
 */
export async function DELETE(request: NextRequest) {
  // В продакшене этот endpoint должен быть защищен или удален!
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
  }

  logger.info('[ResetRateLimit] Resetting rate limit for:', email)

  try {
    // Удаляем запись о попытках входа
    const result = await prisma.loginAttempt.deleteMany({
      where: {
        identifier: email,
        type: 'EMAIL',
      },
    })

    logger.info('[ResetRateLimit] Deleted', result.count, 'records')

    return NextResponse.json({
      success: true,
      message: `Rate limit reset for ${email}`,
      deletedRecords: result.count,
    })
  } catch (error) {
    logger.error('[ResetRateLimit] Error:', error)
    return NextResponse.json({ error: 'Failed to reset rate limit' }, { status: 500 })
  }
}
