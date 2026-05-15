import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

const DEFAULT_IDB_KEY = 'REACT_QUERY_OFFLINE_CACHE'

export interface IDBPersisterOptions {
  /**
   * Ключ в IndexedDB
   * @default 'REACT_QUERY_OFFLINE_CACHE'
   */
  key?: string
}

/**
 * Проверка, что мы в браузере с поддержкой IndexedDB
 */
function canUseIDB(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

/**
 * Ленивый импорт idb-keyval для избежания SSR проблем
 */
async function getIDBKeyval() {
  if (!canUseIDB()) {
    return null
  }
  return await import('idb-keyval')
}

/**
 * Создаёт Persister для сохранения кэша TanStack Query в IndexedDB
 *
 * Данные сохраняются между сессиями браузера, что позволяет
 * приложению работать оффлайн с ранее загруженными данными.
 *
 * SSR-безопасен: на сервере возвращает no-op persister.
 *
 * @example
 * ```tsx
 * const persister = createIDBPersister()
 *
 * <PersistQueryClientProvider
 *   client={queryClient}
 *   persistOptions={{ persister }}
 * >
 *   {children}
 * </PersistQueryClientProvider>
 * ```
 */
export function createIDBPersister(options: IDBPersisterOptions = {}): Persister {
  const { key = DEFAULT_IDB_KEY } = options

  return {
    persistClient: async (client: PersistedClient) => {
      const idb = await getIDBKeyval()
      if (idb) {
        await idb.set(key, client)
      }
    },
    restoreClient: async () => {
      const idb = await getIDBKeyval()
      if (idb) {
        return await idb.get<PersistedClient>(key)
      }
      return undefined
    },
    removeClient: async () => {
      const idb = await getIDBKeyval()
      if (idb) {
        await idb.del(key)
      }
    },
  }
}
