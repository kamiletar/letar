import { getSession } from '@/lib/auth'
import { loadDeepDiffData } from '@/lib/episode-manifest-loader'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/deep-diff?directoryCid=...
 *
 * Загружает полную сводку IPFS-манифеста для глубокого сравнения замен:
 * - Верхнеуровневые поля (posterCid, animeInfoCid, franchiseGraphCid, ...)
 * - Сводка каждого эпизода (видео, аудио, субтитры, кодирование, главы, скриншоты)
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

  const result = await loadDeepDiffData(directoryCid)

  if (!result) {
    // Не кешируем ошибки — при повторе нужен свежий запрос
    return NextResponse.json(
      { manifest: { episodeCount: 0 }, episodes: [] },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  // Кешируем только если ВСЕ эпизоды загрузились успешно
  const allLoaded = result.episodes.every((ep) => ep.manifestLoaded)
  const headers = {
    'Cache-Control': allLoaded ? 'public, max-age=86400, immutable' : 'no-store',
  }

  return NextResponse.json(result, { headers })
}
