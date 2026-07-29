// Общий boilerplate для простых key-value хранилищ поверх IndexedDB: открытие базы с одним
// объектным стором + промисификация put/get/getAll/getAllByIndex/delete с единообразной
// обработкой ошибок (fallback на generic Error, если req.error/tx.error не Error).

export interface KvStoreIndex {
  name: string
  keyPath: string
}

export interface KvStoreOptions {
  version?: number
  keyPath?: string
  indexes?: KvStoreIndex[]
}

export interface KvStore<T> {
  put(value: T): Promise<void>
  get(id: string): Promise<T | undefined>
  getAll(): Promise<T[]>
  getAllByIndex(indexName: string, query: IDBValidKey): Promise<T[]>
  delete(id: string): Promise<void>
}

function toError(candidate: unknown, fallbackMessage: string): Error {
  return candidate instanceof Error ? candidate : new Error(fallbackMessage)
}

export function createKvStore<T>(dbName: string, storeName: string, options: KvStoreOptions = {}): KvStore<T> {
  const { version = 1, keyPath = 'id', indexes = [] } = options

  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, version)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath })
          for (const index of indexes) {
            store.createIndex(index.name, index.keyPath)
          }
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(toError(req.error, `IndexedDB: не удалось открыть ${dbName}`))
    })
  }

  async function put(value: T): Promise<void> {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).put(value)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(toError(tx.error, `IndexedDB: не удалось сохранить в ${storeName}`))
    })
    db.close()
  }

  async function get(id: string): Promise<T | undefined> {
    const db = await openDb()
    const result = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).get(id)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(toError(req.error, `IndexedDB: не удалось прочитать из ${storeName}`))
    })
    db.close()
    return result
  }

  async function getAll(): Promise<T[]> {
    const db = await openDb()
    const result = await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(toError(req.error, `IndexedDB: не удалось прочитать из ${storeName}`))
    })
    db.close()
    return result
  }

  async function getAllByIndex(indexName: string, query: IDBValidKey): Promise<T[]> {
    const db = await openDb()
    const result = await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).index(indexName).getAll(query)
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(toError(req.error, `IndexedDB: не удалось прочитать из ${storeName}`))
    })
    db.close()
    return result
  }

  async function deleteById(id: string): Promise<void> {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(toError(tx.error, `IndexedDB: не удалось удалить из ${storeName}`))
    })
    db.close()
  }

  return { put, get, getAll, getAllByIndex, delete: deleteById }
}
