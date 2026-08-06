import { getLocalClient } from '@/lib/server-client'
import { NextResponse } from 'next/server'

/**
 * GET /api/deploy/status
 * Возвращает статус деплоя через dashboard-agent
 */
export async function GET() {
  try {
    const client = getLocalClient()
    const status = await client.getDeployStatus!()

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Error in /api/deploy/status:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
