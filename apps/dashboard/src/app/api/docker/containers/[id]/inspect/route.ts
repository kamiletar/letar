import { NextResponse } from 'next/server'

/**
 * GET /api/docker/containers/[id]/inspect
 * @deprecated Container inspect не поддерживается через agent API
 */
export async function GET() {
  return NextResponse.json({ error: 'Container inspect not available via agent API.' }, { status: 501 })
}
