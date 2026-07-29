import { isAuthorizedMentorRequest } from '@/lib/mentor/auth'
import { publishMentorEvent } from '@/lib/mentor/event-bus'
import { MentorEventSchema } from '@/lib/mentor/schema'
import { NextResponse } from 'next/server'

// Внутренний эндпоинт, который дёргает MCP-сервер (отдельный Node-процесс) —
// публикует событие в шину, SSE-эндпоинт разносит его по подключённым браузерам
export async function POST(request: Request) {
  if (!isAuthorizedMentorRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = MentorEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  publishMentorEvent(parsed.data)
  return NextResponse.json({ ok: true })
}
