import { NextResponse } from 'next/server'

/**
 * GET /api/deploy/logs/[id]
 * Не поддерживается — логи деплоя хранятся в dashboard-agent
 */
export function GET() {
  return NextResponse.json(
    { success: false, error: 'Not implemented. Deploy logs are managed by dashboard-agent.' },
    { status: 501 }
  )
}
