import { NextResponse } from 'next/server'

/**
 * GET /api/deploy/history
 * История деплоев недоступна — деплой теперь через dashboard-agent
 */
export function GET() {
  return NextResponse.json(
    { success: false, error: 'Deploy history is not available. Deploy runs via dashboard-agent.' },
    { status: 501 }
  )
}
