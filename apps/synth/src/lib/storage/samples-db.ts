// Приватное локальное хранилище бинарных сэмплов драм-пэдов — отдельная IndexedDB-база от
// патчей (patches-db.ts): сэмплы это сырые аудио-байты, а не JSON, и им не место внутри
// патча (см. комментарий у DrumPadSampleSchema в schema.ts). Ничего не покидает машину сама
// по себе — публикация патча ссылку на сэмпл не разрешает ни во что скачиваемое другими.

const DB_NAME = 'synth-samples'
const DB_VERSION = 1
const STORE = 'samples'

export interface StoredSample {
  id: string
  name: string
  data: ArrayBuffer
  mimeType: string
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error instanceof Error ? req.error : new Error('IndexedDB: не удалось открыть'))
  })
}

export function generateSampleId(): string {
  return `sample-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function saveSample(sample: StoredSample): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(sample)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('IndexedDB: не удалось сохранить сэмпл'))
  })
  db.close()
}

export async function getSample(id: string): Promise<StoredSample | undefined> {
  const db = await openDb()
  const result = await new Promise<StoredSample | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as StoredSample | undefined)
    req.onerror = () => reject(req.error instanceof Error ? req.error : new Error('IndexedDB: не удалось прочитать сэмпл'))
  })
  db.close()
  return result
}

export async function deleteSample(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('IndexedDB: не удалось удалить сэмпл'))
  })
  db.close()
}
