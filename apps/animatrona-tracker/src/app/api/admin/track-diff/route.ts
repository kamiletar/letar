import { getSession } from '@/lib/auth'
import { loadTracksSummary } from '@/lib/track-loader'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/track-diff?directoryCid=...
 *
 * Загружает summary аудио/субтитров из IPFS манифеста.
 * Используется клиентским компонентом сравнения при раскрытии спойлера.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'MODERATOR' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const directoryCid = url.searchParams.get('directoryCid')

  if (!directoryCid) {
    return NextResponse.json({ error: 'directoryCid is required' }, { status: 400 })
  }

  const result = await loadTracksSummary(directoryCid)

  // IPFS контент иммутабелен по CID — безопасно кешировать на 24ч
  const headers = {
    'Cache-Control': 'public, max-age=86400, immutable',
  }

  if (!result) {
    return NextResponse.json({ audioTracks: [], subtitleTracks: [] }, { headers })
  }

  return NextResponse.json(result, { headers })
}
