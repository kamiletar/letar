import type { Patch } from '@/lib/patch/schema'

// Приватное локальное хранилище патчей — IndexedDB браузера, ничего не покидает машину
// (см. claude.md §6 «Приватность»). Публикация в /gallery — отдельный ручной шаг (копия в patches/*.json).

const DB_NAME = 'synth-patches'
const DB_VERSION = 1
const STORE = 'patches'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('type', 'type')
        store.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error instanceof Error ? req.error : new Error('IndexedDB: не удалось открыть'))
  })
}

// Транслитерация имени в id-совместимый слаг (схема патча требует /^[a-z0-9-]+$/)
export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }
  const translit = name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
  const slug = translit
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'patch'
}

export async function savePatch(patch: Patch): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(patch)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('IndexedDB: не удалось сохранить'))
  })
  db.close()
}

export async function listPatches(type: Patch['type']): Promise<Patch[]> {
  const db = await openDb()
  const result = await new Promise<Patch[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const index = tx.objectStore(STORE).index('type')
    const req = index.getAll(type)
    req.onsuccess = () => resolve(req.result as Patch[])
    req.onerror = () => reject(req.error instanceof Error ? req.error : new Error('IndexedDB: не удалось прочитать'))
  })
  db.close()
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deletePatch(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('IndexedDB: не удалось удалить'))
  })
  db.close()
}
