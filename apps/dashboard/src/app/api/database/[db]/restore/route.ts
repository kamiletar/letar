import { NextResponse } from 'next/server'

/**
 * POST /api/database/[db]/restore
 * @deprecated Восстановление БД из бэкапа не поддерживается через agent API
 */
export async function POST() {
  return NextResponse.json({ error: 'Database restore not available via agent API.' }, { status: 501 })
}
