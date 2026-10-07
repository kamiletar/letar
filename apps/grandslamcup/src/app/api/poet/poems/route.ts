/**
 * Стихи текущего поэта для режима чтеца (`/reader`).
 *
 * GET  /api/poet/poems — все стихи (с черновиками) для локальной копии.
 * POST /api/poet/poems — применить правки, сделанные без сети, и вернуть свежую копию.
 */

import { applyPoemChanges, loadPoetPoems, SyncRequestSchema } from '@/lib/poet-poems-sync'
import { requirePoetAction } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

/** Личные данные — ни браузер, ни прокси не должны их кэшировать */
const NO_STORE = { 'Cache-Control': 'no-store' }

type Poet = Extract<Awaited<ReturnType<typeof requirePoetAction>>, { success: true }>['poet']

/** Поэт из сессии или null, если не вошёл */
async function getPoet(): Promise<Poet | null> {
  try {
    const result = await requirePoetAction()
    return result.success ? result.poet : null
  } catch {
    // сессия есть, но пользователь в БД не найден — для клиента это тот же «не вошли»
    return null
  }
}

const unauthorized = () => NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: NO_STORE })

export async function GET() {
  const poet = await getPoet()
  if (!poet) {
    return unauthorized()
  }

  return NextResponse.json(
    { poetName: poet.playerName, syncedAt: new Date().toISOString(), poems: await loadPoetPoems(poet.playerId) },
    { headers: NO_STORE },
  )
}

export async function POST(request: Request) {
  // Запись по cookie-сессии: чужой origin и не-JSON отсекаем (SameSite=Lax — ещё один барьер)
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).host !== request.headers.get('host')) {
    return NextResponse.json({ error: 'Запрещено' }, { status: 403, headers: NO_STORE })
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Ожидается JSON' }, { status: 415, headers: NO_STORE })
  }

  const poet = await getPoet()
  if (!poet) {
    return unauthorized()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400, headers: NO_STORE })
  }

  const parsed = SyncRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400, headers: NO_STORE })
  }

  const results = await applyPoemChanges(poet.playerId, parsed.data.changes)
  if (results.some((result) => result.status === 'ok')) {
    revalidatePath('/poet/poems')
  }

  return NextResponse.json(
    {
      poetName: poet.playerName,
      syncedAt: new Date().toISOString(),
      poems: await loadPoetPoems(poet.playerId),
      results,
    },
    { headers: NO_STORE },
  )
}
