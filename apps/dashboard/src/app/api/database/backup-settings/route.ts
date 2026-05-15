import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Backup settings moved to dashboard-agent' }, { status: 501 })
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Backup settings moved to dashboard-agent' }, { status: 501 })
}
