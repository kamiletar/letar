import { describeCronExpression, getNextRunDates, validateCronExpression } from '@/lib/cron'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/cron/validate
 * Валидирует cron выражение и возвращает следующие запуски
 */
export async function POST(request: NextRequest) {
  try {
    const { schedule } = await request.json()

    if (!schedule || typeof schedule !== 'string') {
      return NextResponse.json({ success: false, error: 'Schedule is required' }, { status: 400 })
    }

    const validation = validateCronExpression(schedule)

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: validation.error,
      })
    }

    const nextRuns = getNextRunDates(schedule, 5)
    const description = describeCronExpression(schedule)

    return NextResponse.json({
      success: true,
      valid: true,
      description,
      nextRuns: nextRuns.map((d) => d.toISOString()),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    )
  }
}
