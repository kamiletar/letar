import { NextResponse } from 'next/server'

/**
 * POST /api/apps/[app]/clean-uploads
 * @deprecated Очистка uploads не поддерживается через agent API
 */
export async function POST() {
  return NextResponse.json({ error: 'Clean uploads not available via agent API.' }, { status: 501 })
}
