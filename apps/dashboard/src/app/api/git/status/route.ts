import { NextResponse } from 'next/server'

/**
 * @deprecated Используй /api/servers/[id]/git/status
 */
export async function GET() {
  return NextResponse.json({ error: 'Deprecated. Use /api/servers/[serverId]/git/status' }, { status: 410 })
}
