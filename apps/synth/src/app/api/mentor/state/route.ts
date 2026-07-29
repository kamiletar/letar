import { MentorStateReportSchema } from '@/lib/mentor/schema'
import { getMentorState, reportMentorState } from '@/lib/mentor/state'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Читает MCP-ресурс daw://current-state
export function GET() {
  return NextResponse.json(getMentorState())
}

// Браузер репортит своё состояние (heartbeat при смене патча/движка)
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = MentorStateReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  reportMentorState(parsed.data)
  return NextResponse.json({ ok: true })
}
