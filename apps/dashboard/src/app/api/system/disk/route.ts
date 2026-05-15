import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId')
    const { client, server } = await getClientByServerId(serverId)

    const diskInfo = await client.getDiskInfo()

    if (server) {
      updateServerLastSeen(server.id)
    }

    return NextResponse.json(diskInfo)
  } catch (error) {
    console.error('Error in /api/system/disk:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get disk info' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
