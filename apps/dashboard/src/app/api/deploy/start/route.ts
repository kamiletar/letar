import { requireAdmin } from '@/lib/auth-utils'
import { getLocalClient } from '@/lib/server-client'
import { NextResponse } from 'next/server'

/**
 * POST /api/deploy/start
 * Запускает деплой через dashboard-agent
 *
 * Body:
 * - app?: string - название приложения (опционально)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { app } = body

    const client = getLocalClient()
    const result = await client.deployApp!(app || 'all')

    return NextResponse.json({
      success: true,
      ...result,
      message: `Deploy started${app ? ` for ${app}` : ''}`,
    })
  } catch (error) {
    console.error('Error in /api/deploy/start:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
