// === Провайдеры ===
export { PersistQueryProvider, type PersistQueryProviderProps } from './lib/persist-provider'
export { QueryProvider, type QueryProviderProps } from './lib/query-provider'
export { ZenStackQueryProvider, type ZenStackQueryProviderProps } from './lib/zenstack-provider'

// === Утилиты ===
export { createQueryClient, getQueryClient, type QueryClientConfig, resetQueryClient } from './lib/create-query-client'

export { createIDBPersister, type IDBPersisterOptions } from './lib/idb-persister'

// === Пресеты кэширования ===
export {
  CACHE_PRESETS,
  type CachePreset,
  OFFLINE_CACHE,
  REALTIME_CACHE,
  STANDARD_CACHE,
  STATIC_CACHE,
} from './lib/cache-presets'
