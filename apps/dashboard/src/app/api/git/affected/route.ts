import { NextResponse } from 'next/server'

/**
 * GET /api/git/affected
 * Не поддерживается — dashboard не имеет доступа к git/Nx CLI
 */
export function GET() {
  return NextResponse.json(
    { success: false, error: 'Not implemented. Dashboard has no direct git/Nx access.' },
    { status: 501 },
  )
}
