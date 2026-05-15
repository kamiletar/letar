import { NextResponse } from 'next/server'

/** Health check endpoint для мониторинга */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'kami-key-the-landing',
    timestamp: new Date().toISOString(),
  })
}
