import { NextResponse } from 'next/server'

/**
 * POST /api/database/[db]/backup
 * @deprecated Используй /api/database/backup через agent API
 * TODO: добавить endpoint в dashboard-agent для бэкапа отдельной БД
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Per-database backup not yet available via agent API. Use agent backup endpoint.' },
    { status: 501 },
  )
}
