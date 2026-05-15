import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { syncPinJobStatuses } from '@/lib/pinning'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/pin-jobs/sync
 * Синхронизировать статусы pin jobs с Kubo.
 *
 * Для каждого задания в статусе PINNING проверяет pin/ls на Kubo.
 * Если CID запинен — обновляет статус на PINNED.
 */
export async function POST() {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const result = await syncPinJobStatuses()
  return NextResponse.json({ data: result })
}
