/**
 * Хранилище картинок режима чтеца в IndexedDB.
 *
 * localStorage для картинок не годится (≈5 МБ на всё и только строки), поэтому обложки лежат
 * здесь. Ключи двух видов:
 * - `pending:<uuid>` — обложка, выбранная на телефоне и ещё не загруженная на сайт;
 * - `cover:<path>` — копия обложки с сайта, чтобы она показывалась без интернета.
 */

const DB_NAME = 'grandslamcup-reader'
const DB_VERSION = 1
const STORE = 'blobs'

export const PENDING_BLOB_PREFIX = 'pending:'
export const COVER_BLOB_PREFIX = 'cover:'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Выполняет одну операцию в транзакции и закрывает соединение */
async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** Сохраняет картинку; false — хранилище недоступно или переполнено */
export async function putBlob(key: string, blob: Blob): Promise<boolean> {
  try {
    await withStore('readwrite', (store) => store.put(blob, key))
    return true
  } catch {
    return false
  }
}

/** Читает картинку; null — нет такой или хранилище недоступно */
export async function getBlob(key: string): Promise<Blob | null> {
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(key))
    // toString вместо instanceof: объект мог прийти из другого контекста (iframe, тестовая среда)
    return Object.prototype.toString.call(value) === '[object Blob]' ? (value as Blob) : null
  } catch {
    return null
  }
}

export async function deleteBlob(key: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(key))
  } catch {
    // нечего удалять или хранилище недоступно — не критично
  }
}

/** Все ключи с данным префиксом */
export async function listBlobKeys(prefix: string): Promise<string[]> {
  try {
    const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    return keys.filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))
  } catch {
    return []
  }
}

/** Ключ для нового фото; время в начале нужно, чтобы не стирать свежее фото, пока его не записали в очередь */
export function createPendingBlobKey(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `${PENDING_BLOB_PREFIX}${Date.now()}-${random}`
}

/** Фото моложе этого срока не стираем: редактор мог только что его выбрать и ещё не сохранить */
const PRUNE_GRACE_MS = 60 * 60 * 1000

/** Стирает фото с телефона, на которые больше не ссылается очередь правок */
export async function pruneBlobs(keep: Iterable<string>, now: number = Date.now()): Promise<void> {
  const referenced = new Set(keep)
  for (const key of await listBlobKeys(PENDING_BLOB_PREFIX)) {
    if (referenced.has(key)) {
      continue
    }
    const createdAt = Number(key.slice(PENDING_BLOB_PREFIX.length).split('-')[0])
    if (Number.isFinite(createdAt) && now - createdAt < PRUNE_GRACE_MS) {
      continue
    }
    await deleteBlob(key)
  }
}

/** URL картинки обложки на сайте; внешние (http) адреса отдаём как есть */
export function coverUrl(path: string): string {
  return path.startsWith('http') ? path : `/api/files/${path}`
}

/**
 * Скачивает обложки с сайта в IndexedDB (только недостающие) и удаляет копии тех, которых
 * больше нет у стихов. Внешние http-адреса не кэшируем: cross-origin fetch упрётся в CORS.
 */
export async function cacheServerCovers(paths: Array<string | null>): Promise<void> {
  const wanted = new Set(paths.filter((path): path is string => !!path && !path.startsWith('http')))
  const existing = new Set(await listBlobKeys(COVER_BLOB_PREFIX))

  for (const path of wanted) {
    const key = `${COVER_BLOB_PREFIX}${path}`
    if (existing.has(key)) {
      continue
    }
    try {
      const response = await fetch(coverUrl(path), { credentials: 'same-origin' })
      if (response.ok) {
        await putBlob(key, await response.blob())
      }
    } catch {
      // нет сети — попробуем при следующей синхронизации
    }
  }

  for (const key of existing) {
    if (!wanted.has(key.slice(COVER_BLOB_PREFIX.length))) {
      await deleteBlob(key)
    }
  }
}
