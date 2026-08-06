import { getNpmClientByServerId } from '@/lib/nginx-proxy-manager-client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/nginx/status
 * Проверка подключения к Nginx Proxy Manager
 *
 * Query параметры:
 * - serverId: string (опционально) - ID сервера
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')

    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return NextResponse.json({
        success: true,
        status: 'not_configured',
        hasNpm: false,
        message: 'NPM не настроен для этого сервера',
      })
    }

    const status = await client.getStatus()
    return NextResponse.json({
      success: true,
      hasNpm: true,
      ...status,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
