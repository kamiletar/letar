/**
 * Service Worker для grandslamcup PWA
 *
 * Serwist: precache + runtime cache.
 * Background Sync для оффлайн-счетовода (Chromium).
 */

/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// === Background Sync для оффлайн-счетовода ===

self.addEventListener('sync', (event) => {
  if (event.tag === 'scorer-sync') {
    event.waitUntil(syncScorerOperations())
  }
})

/**
 * Синхронизация pending операций из IndexedDB.
 * Вызывается Background Sync API (Chromium) при восстановлении связи.
 */
async function syncScorerOperations() {
  try {
    // Открываем IndexedDB напрямую (не через idb-keyval — SW не имеет доступ к React)
    const db = await openScorerDB()
    const tx = db.transaction('operations', 'readonly')
    const store = tx.objectStore('operations')
    const ops = await getAllFromStore(store)

    if (ops.length === 0) {
      return
    }

    // Группируем по matchId
    const byMatch = new Map<string, typeof ops>()
    for (const op of ops) {
      const list = byMatch.get(op.matchId) || []
      list.push(op)
      byMatch.set(op.matchId, list)
    }

    // Синхронизируем каждый матч
    for (const [matchId, matchOps] of byMatch) {
      const response = await fetch(`/api/match/${matchId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: matchOps }),
      })

      if (response.ok) {
        // Удаляем успешно синхронизированные операции
        const deleteTx = db.transaction('operations', 'readwrite')
        const deleteStore = deleteTx.objectStore('operations')
        for (const op of matchOps) {
          deleteStore.delete(op.id)
        }
      } else {
        // При ошибке — бросить, чтобы браузер повторил позже
        throw new Error(`Sync failed for match ${matchId}: ${response.status}`)
      }
    }
  } catch (error) {
    console.error('[SW] scorer-sync ошибка:', error)
    throw error // Браузер повторит sync позже
  }
}

// === IDB утилиты для Service Worker ===

function openScorerDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('grandslamcup-scorer', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'matchId' })
      }
      if (!db.objectStoreNames.contains('operations')) {
        const store = db.createObjectStore('operations', { keyPath: 'id' })
        store.createIndex('matchId', 'matchId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAllFromStore(
  store: IDBObjectStore
): Promise<Array<{ id: string; matchId: string; [key: string]: unknown }>> {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
