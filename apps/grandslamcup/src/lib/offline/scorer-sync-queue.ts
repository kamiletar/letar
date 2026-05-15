/**
 * Очередь синхронизации оффлайн-счетовода.
 *
 * Клиентский код: enqueue операции + sync при восстановлении связи.
 * Background Sync (Chromium): SW сам вызывает sync endpoint.
 * Safari fallback: online event + ручная кнопка.
 */

import {
  enqueueOperation,
  getPendingOperations,
  removeOperation,
  type ScorerOperation,
  type ScorerOperationType,
} from './scorer-offline-store'

// === Типы ===

export interface SyncResult {
  synced: number
  total: number
  error?: string
}

// === Постановка операции в очередь ===

/**
 * Добавить операцию в очередь и запросить Background Sync (если доступен).
 */
export async function queueScorerOperation(
  matchId: string,
  type: ScorerOperationType,
  payload: Record<string, unknown>
): Promise<ScorerOperation> {
  const op = await enqueueOperation({ matchId, type, payload })

  // Запросить Background Sync (Chromium)
  await requestBackgroundSync()

  return op
}

/** Запросить Background Sync если поддерживается */
async function requestBackgroundSync(): Promise<void> {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        'scorer-sync'
      )
    }
  } catch {
    // Background Sync не поддерживается — fallback через online event
  }
}

// === Синхронизация (вызывается клиентом или SW) ===

/**
 * Синхронизировать pending операции для матча.
 * Вызывается при:
 * - online event (Safari fallback)
 * - Ручная кнопка "Синхронизировать"
 * - Background Sync (Chromium) — через SW fetch к /api/match/{id}/sync
 */
export async function syncMatchOperations(matchId: string, scorerToken: string): Promise<SyncResult> {
  const ops = await getPendingOperations(matchId)
  if (ops.length === 0) {
    return { synced: 0, total: 0 }
  }

  // Отправляем на сервер batch-ом
  try {
    const response = await fetch(`/api/match/${matchId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: ops,
        scorerToken,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { synced: 0, total: ops.length, error: `Сервер: ${response.status} ${text}` }
    }

    const result = (await response.json()) as { synced: string[]; errors: Array<{ id: string; error: string }> }

    // Удаляем успешно синхронизированные
    for (const id of result.synced) {
      await removeOperation(id)
    }

    const errorCount = result.errors?.length ?? 0
    if (errorCount > 0) {
      return {
        synced: result.synced.length,
        total: ops.length,
        error: `${errorCount} операций с ошибками`,
      }
    }

    return { synced: result.synced.length, total: ops.length }
  } catch (err) {
    return {
      synced: 0,
      total: ops.length,
      error: err instanceof Error ? err.message : 'Ошибка сети',
    }
  }
}
