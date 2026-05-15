import { type DefaultOptions, QueryClient } from '@tanstack/react-query'
import { CACHE_PRESETS, type CachePreset } from './cache-presets'

export interface QueryClientConfig {
  /**
   * Пресет кэширования
   * @default 'standard'
   */
  preset?: CachePreset

  /**
   * Кастомные настройки (переопределяют пресет)
   */
  defaultOptions?: DefaultOptions

  /**
   * Обработчик ошибок мутаций
   */
  onMutationError?: (error: Error) => void
}

/**
 * Создаёт QueryClient с настройками
 *
 * @example
 * ```tsx
 * // Использовать стандартный пресет
 * const client = createQueryClient()
 *
 * // Использовать оффлайн пресет для PWA
 * const client = createQueryClient({ preset: 'offline' })
 *
 * // Кастомные настройки
 * const client = createQueryClient({
 *   preset: 'realtime',
 *   defaultOptions: {
 *     queries: { staleTime: 1000 }
 *   }
 * })
 * ```
 */
export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  const { preset = 'standard', defaultOptions, onMutationError } = config

  const presetOptions = CACHE_PRESETS[preset]

  return new QueryClient({
    defaultOptions: {
      queries: {
        ...presetOptions,
        ...defaultOptions?.queries,
      },
      mutations: {
        retry: preset === 'offline' ? 3 : 0,
        networkMode: preset === 'offline' ? 'offlineFirst' : 'online',
        onError: onMutationError,
        ...defaultOptions?.mutations,
      },
    },
  })
}

/**
 * Синглтон QueryClient для браузера
 * Сервер всегда создаёт новый клиент
 */
let browserQueryClient: QueryClient | undefined

/**
 * Получить QueryClient (синглтон в браузере)
 *
 * @example
 * ```tsx
 * const queryClient = getQueryClient({ preset: 'offline' })
 * ```
 */
export function getQueryClient(config?: QueryClientConfig): QueryClient {
  if (typeof window === 'undefined') {
    // Сервер: всегда создаём новый QueryClient
    return createQueryClient(config)
  }

  // Браузер: используем синглтон
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient(config)
  }
  return browserQueryClient
}

/**
 * Сбросить синглтон QueryClient (для тестов)
 */
export function resetQueryClient(): void {
  browserQueryClient = undefined
}
