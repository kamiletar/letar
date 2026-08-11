import { getLatestScan } from '@/lib/deps'
import { NextResponse } from 'next/server'

/**
 * GET /api/deps/latest
 * Последний скан зависимостей + все пакеты. Защищён сессией через proxy.ts (не в publicPaths).
 */
export async function GET() {
  try {
    const scan = await getLatestScan()
    return NextResponse.json({ success: true, scan })
  } catch (error) {
    console.error('Error in GET /api/deps/latest:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
