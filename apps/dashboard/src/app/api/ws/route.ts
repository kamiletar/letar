import { NextResponse } from 'next/server'

/**
 * @deprecated WebSocket endpoint удалён — используй /api/stream/unified для SSE стриминга
 */
export async function GET() {
  return NextResponse.json(
    { error: 'WebSocket endpoint deprecated. Use /api/stream/unified for SSE streaming.' },
    { status: 410 },
  )
}
