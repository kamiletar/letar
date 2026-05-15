import { isAuthError, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { updateVoiceActingFromIpfs } from '@/lib/voice-acting'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/backfill-voice-acting
 *
 * Проходит по всем PUBLISHED аниме с пустым voiceActing (или всем, если ?all=1)
 * и заполняет их на основе EpisodeManifest первого эпизода.
 *
 * Только для ADMIN. Выполняется последовательно (IPFS может быть медленным).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { searchParams } = request.nextUrl
  const processAll = searchParams.get('all') === '1'

  const anime = await prisma.anime.findMany({
    where: {
      status: 'PUBLISHED',
      ...(processAll ? {} : { voiceActing: { isEmpty: true } }),
    },
    select: { id: true, title: true, directoryCid: true },
  })

  const stats = {
    total: anime.length,
    updated: 0,
    empty: 0,
    errors: 0,
    samples: [] as Array<{ id: string; title: string; codes: string[] }>,
  }

  for (const a of anime) {
    const result = await updateVoiceActingFromIpfs(a.id, a.directoryCid)

    if (result.updated) {
      if (result.codes.length > 0) {
        stats.updated++
        if (stats.samples.length < 10) {
          stats.samples.push({ id: a.id, title: a.title, codes: result.codes })
        }
      } else {
        stats.empty++
      }
    } else {
      stats.errors++
    }
  }

  return NextResponse.json({ data: stats })
}
