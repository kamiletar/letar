import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Backup cron moved to dashboard-agent' }, { status: 501 })
}
