import { NextResponse } from 'next/server'

/**
 * @deprecated Используй /api/servers/[id]/git/incoming
 */
export async function GET() {
  return NextResponse.json({ error: 'Deprecated. Use /api/servers/[serverId]/git/incoming' }, { status: 410 })
}
