import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { autoPinAnime, pinAnime } from '@/lib/pinning'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

type Params = Promise<{ animeId: string }>

const PinBodySchema = z
  .object({
    /** Конкретный сервер (override шардирования) */
    serverId: z.string().optional(),
  })
  .strip()

/**
 * POST /api/admin/pin/[animeId]
 * Запинить аниме на пин-сервере
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { session } = auth

  const { animeId } = await params

  // Body может быть пустым (автовыбор сервера) или содержать serverId
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // Пустой body — это нормально, будет автовыбор сервера
  }
  const parsed = PinBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    if (parsed.data.serverId) {
      // Пинить на конкретном сервере
      const { results } = await pinAnime(animeId, parsed.data.serverId, session.user.id)
      const hasErrors = results.some((r) => !r.success)
      return NextResponse.json({ data: { results } }, { status: hasErrors ? 207 : 200 })
    }

    // Автовыбор сервера (шардирование — один сервер на аниме)
    const result = await autoPinAnime(animeId, session.user.id)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const hasErrors = result.servers.some((s) => s.results.some((r) => !r.success))
    return NextResponse.json({ data: result }, { status: hasErrors ? 207 : 200 })
  } catch (error) {
    console.error('Pin error:', error)
    return NextResponse.json({ error: 'Ошибка пиннинга' }, { status: 500 })
  }
}
