import { NextResponse } from 'next/server'

/**
 * GET /api/apps/[app]/env
 * @deprecated Чтение переменных окружения контейнера не поддерживается через agent API
 */
export async function GET() {
  return NextResponse.json({ error: 'Container env inspection not available via agent API.' }, { status: 501 })
}
