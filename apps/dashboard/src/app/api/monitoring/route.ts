import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: true, monitoring: false, running: false })
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Monitoring control moved to dashboard-agent' }, { status: 501 })
}
