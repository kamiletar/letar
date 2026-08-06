import { NextResponse } from 'next/server'

/**
 * POST /api/deploy/clear-logs
 * Не поддерживается — логи деплоя хранятся в dashboard-agent
 */
export function POST() {
  return NextResponse.json(
    { success: false, error: 'Not implemented. Deploy logs are managed by dashboard-agent.' },
    { status: 501 },
  )
}
