import { NextResponse } from 'next/server'

/**
 * @deprecated Используй /api/stream/unified
 */
export async function GET() {
  return NextResponse.json({ error: 'Deprecated. Use /api/stream/unified' }, { status: 410 })
}
