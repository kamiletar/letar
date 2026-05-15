import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { unpinAnime } from '@/lib/pinning'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

type Params = Promise<{ animeId: string }>

const UnpinBodySchema = z
  .object({
    serverId: z.string(),
  })
  .strip()

/**
 * POST /api/admin/unpin/[animeId]
 * Распинить аниме с пин-сервера
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { animeId } = await params
  const body = await request.json()
  const parsed = UnpinBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const { results } = await unpinAnime(animeId, parsed.data.serverId)
    const hasErrors = results.some((r) => !r.success)
    return NextResponse.json({ data: { results } }, { status: hasErrors ? 207 : 200 })
  } catch (error) {
    console.error('Unpin error:', error)
    return NextResponse.json({ error: 'Ошибка распиннинга' }, { status: 500 })
  }
}
