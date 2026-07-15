import { getStorageStats } from '@/lib/storage'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/apps/[app]/storage
 * Returns storage statistics for the application's static files
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params

  try {
    // Only web apps have static files to track
    const webApps = ['dashboard']

    if (!webApps.includes(app)) {
      return NextResponse.json({ error: 'Application does not have static files' }, { status: 404 })
    }

    const stats = await getStorageStats(app)

    return NextResponse.json(stats)
  } catch (error) {
    console.error(`Error getting storage stats for app ${app}:`, error)
    return NextResponse.json({ error: 'Failed to get storage statistics' }, { status: 500 })
  }
}
