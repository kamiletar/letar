import { NextResponse } from 'next/server'

/**
 * DELETE /api/database/[db]/backups/[id]
 * @deprecated Удаление бэкапов не поддерживается через agent API
 */
export async function DELETE() {
  return NextResponse.json({ error: 'Backup deletion not available via agent API.' }, { status: 501 })
}
