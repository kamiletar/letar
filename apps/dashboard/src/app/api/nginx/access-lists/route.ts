import { npmApi } from '@/lib/nginx-proxy-manager'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/nginx/access-lists
 * Получить список всех Access Lists
 */
export async function GET() {
  try {
    const accessLists = await npmApi.getAccessLists()
    return NextResponse.json({
      success: true,
      data: accessLists,
      count: accessLists.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
