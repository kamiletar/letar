'use client'

import { saveNoteAction, type SaveResult } from '@/app/_actions/notes.action'
import { enqueue, markSynced, type OutboxItem } from '@/lib/outbox'

const DB_NAME = 'notebook'
const STORE = 'kv'
const QUEUE_KEY = 'outbox'

/** Событие для интерфейса: очередь изменилась */
export const OUTBOX_EVENT = 'notebook:outbox'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readQueue(): Promise<OutboxItem[]> {
  const db = await openDb()
  try {
    return await new Promise<OutboxItem[]>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(QUEUE_KEY)
      request.onsuccess = () => resolve((request.result as OutboxItem[] | undefined) ?? [])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function writeQueue(queue: OutboxItem[]): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(queue, QUEUE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail: queue.length }))
}

// Чтение–изменение–запись очереди идёт строго по одному: редактор и отправка не затирают друг друга
let chain: Promise<unknown> = Promise.resolve()
function updateQueue<T>(fn: (queue: OutboxItem[]) => { queue: OutboxItem[]; value: T }): Promise<T> {
  const run = chain.then(async () => {
    const { queue, value } = fn(await readQueue())
    await writeQueue(queue)
    return value
  })
  chain = run.catch(() => undefined)
  return run
}

/** Очередь на устройстве. Если IndexedDB недоступна (приватный режим) — пустой список */
export async function getOutbox(): Promise<OutboxItem[]> {
  try {
    return await readQueue()
  } catch {
    return []
  }
}

/** Кладёт правку в очередь. `false` — хранилище недоступно, надо отправлять напрямую */
export async function queueEdit(item: OutboxItem): Promise<boolean> {
  try {
    await updateQueue((queue) => ({ queue: enqueue(queue, item), value: null }))
    return true
  } catch {
    return false
  }
}

export interface FlushReport {
  /** Что получилось отправить, по localId */
  synced: Map<string, SaveResult>
  /** Отправка остановилась из-за сети */
  offline: boolean
  /** Сессия закончилась: нужно войти заново */
  unauthorized: boolean
}

let running: Promise<FlushReport> | null = null

/** Отправляет очередь на сервер по порядку. Параллельные вызовы ждут текущий прогон */
export async function flushOutbox(): Promise<FlushReport> {
  while (running) {
    await running.catch(() => undefined)
  }
  running = doFlush()
  try {
    return await running
  } finally {
    running = null
  }
}

async function doFlush(): Promise<FlushReport> {
  const report: FlushReport = { synced: new Map(), offline: false, unauthorized: false }
  const queue = await getOutbox()

  for (const item of queue) {
    let response
    try {
      response = await saveNoteAction({
        noteId: item.noteId ?? undefined,
        baseVersionId: item.baseVersionId,
        title: item.title,
        body: item.body,
        deviceId: item.deviceId,
      })
    } catch {
      report.offline = true
      return report
    }
    if (!response.success) {
      if (response.error === 'UNAUTHORIZED') {
        report.unauthorized = true
        return report
      }
      // Остальные ошибки (например, заметку удалили) не лечатся повтором: оставляем в очереди и идём дальше
      continue
    }
    const { noteId, versionId } = response.data
    await updateQueue((current) => ({ queue: markSynced(current, item, { noteId, versionId }), value: null }))
    report.synced.set(item.localId, response.data)
  }
  return report
}
