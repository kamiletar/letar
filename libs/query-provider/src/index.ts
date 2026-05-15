// === Провайдеры ===
export { PersistQueryProvider, type PersistQueryProviderProps } from './lib/persist-provider'
export { QueryProvider, type QueryProviderProps } from './lib/query-provider'
export { ZenStackQueryProvider, type ZenStackQueryProviderProps } from './lib/zenstack-provider'

// === Утилиты ===
export { createQueryClient, getQueryClient, resetQueryClient, type QueryClientConfig } from './lib/create-query-client'

export { createIDBPersister, type IDBPersisterOptions } from './lib/idb-persister'

// === Пресеты кэширования ===
export {
  CACHE_PRESETS,
  OFFLINE_CACHE,
  REALTIME_CACHE,
  STANDARD_CACHE,
  STATIC_CACHE,
  type CachePreset,
} from './lib/cache-presets'
