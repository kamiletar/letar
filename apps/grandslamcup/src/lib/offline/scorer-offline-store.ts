/**
 * IndexedDB store для оффлайн-счетовода.
 *
 * Хранит snapshot матча (составы, оценки) и очередь операций.
 * Используется и в клиентском коде, и в Service Worker.
 */

const DB_NAME = 'grandslamcup-scorer'
const DB_VERSION = 1
const SNAPSHOTS_STORE = 'snapshots'
const OPERATIONS_STORE = 'operations'

// === Типы ===

/** Snapshot матча для оффлайн-работы */
export interface MatchSnapshot {
  matchId: string
  /** Полные данные матча (сериализованный MatchData из scorer page) */
  data: unknown
  /** Когда сохранён */
  savedAt: number
}

/** Тип операции счетовода */
export type ScorerOperationType =
  | 'ENTER_VOTE'
  | 'SET_PERFORMER'
  | 'START_TEXT_VOTING'
  | 'START_DELIVERY_VOTING'
  | 'NEXT_ROUND'
  | 'ISSUE_CARD'
  | 'FINISH_HALF'
  | 'FINISH_MATCH'
  | 'STOP_TIMER'
  | 'END_PERFORMANCE'

/** Операция в очереди синхронизации */
export interface ScorerOperation {
  /** Уникальный ID операции */
  id: string
  /** ID матча */
  matchId: string
  /** Тип операции */
  type: ScorerOperationType
  /** Параметры операции */
  payload: Record<string, unknown>
  /** Когда создана */
  createdAt: number
}

// === Открытие БД ===

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'matchId' })
      }
      if (!db.objectStoreNames.contains(OPERATIONS_STORE)) {
        const store = db.createObjectStore(OPERATIONS_STORE, { keyPath: 'id' })
        store.createIndex('matchId', 'matchId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

// === IDB утилиты ===

function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const request = tx.objectStore(storeName).get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

function idbPut<T>(storeName: string, value: T): Promise<void> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).put(value)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

function idbDelete(storeName: string, key: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

function idbGetAllByIndex<T>(storeName: string, indexName: string, key: string): Promise<T[]> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const index = tx.objectStore(storeName).index(indexName)
      const request = index.getAll(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

// === Публичный API — Snapshots ===

/** Сохранить snapshot матча для оффлайн-работы */
export async function saveMatchSnapshot(matchId: string, data: unknown): Promise<void> {
  const snapshot: MatchSnapshot = {
    matchId,
    data,
    savedAt: Date.now(),
  }
  await idbPut(SNAPSHOTS_STORE, snapshot)
}

/** Загрузить snapshot матча */
export async function loadMatchSnapshot(matchId: string): Promise<MatchSnapshot | undefined> {
  return idbGet<MatchSnapshot>(SNAPSHOTS_STORE, matchId)
}

// === Публичный API — Operations queue ===

const MAX_QUEUE_SIZE = 100

/** Добавить операцию в очередь */
export async function enqueueOperation(op: Omit<ScorerOperation, 'id' | 'createdAt'>): Promise<ScorerOperation> {
  const fullOp: ScorerOperation = {
    ...op,
    id: `${op.matchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }

  // Проверяем лимит
  const existing = await getPendingOperations(op.matchId)
  if (existing.length >= MAX_QUEUE_SIZE) {
    throw new Error(`Очередь переполнена (${MAX_QUEUE_SIZE} операций). Подключитесь к интернету для синхронизации.`)
  }

  await idbPut(OPERATIONS_STORE, fullOp)
  return fullOp
}

/** Получить все pending операции для матча */
export async function getPendingOperations(matchId: string): Promise<ScorerOperation[]> {
  return idbGetAllByIndex<ScorerOperation>(OPERATIONS_STORE, 'matchId', matchId)
}

/** Удалить операцию после успешной синхронизации */
export async function removeOperation(id: string): Promise<void> {
  await idbDelete(OPERATIONS_STORE, id)
}

/** Получить общее количество pending операций */
export async function getPendingCount(matchId: string): Promise<number> {
  const ops = await getPendingOperations(matchId)
  return ops.length
}
