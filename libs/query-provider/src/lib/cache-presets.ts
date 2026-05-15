import type { DefaultOptions } from '@tanstack/react-query'

/**
 * Пресеты кэширования для разных сценариев использования
 */

/**
 * Realtime данные — обновляются часто
 * Подходит для: метрики, алерты, чаты
 */
export const REALTIME_CACHE: DefaultOptions['queries'] = {
  staleTime: 5 * 1000, // 5 секунд
  gcTime: 60 * 1000, // 1 минута
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 1,
  retryDelay: 1000,
}

/**
 * Стандартные данные — умеренная частота обновлений
 * Подходит для: списки, каталоги, профили
 */
export const STANDARD_CACHE: DefaultOptions['queries'] = {
  staleTime: 5 * 60 * 1000, // 5 минут
  gcTime: 5 * 60 * 1000, // 5 минут (было 30 — memory leak fix)
  refetchOnWindowFocus: false, // Отключено — снижает нагрузку на GC
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
}

/**
 * Статичные данные — редко меняются
 * Подходит для: категории, настройки, справочники
 */
export const STATIC_CACHE: DefaultOptions['queries'] = {
  staleTime: 30 * 60 * 1000, // 30 минут
  gcTime: 60 * 60 * 1000, // 1 час
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 3,
}

/**
 * Оффлайн-first — для PWA приложений
 * Подходит для: e-commerce, контент-приложения
 */
export const OFFLINE_CACHE: DefaultOptions['queries'] = {
  networkMode: 'offlineFirst',
  staleTime: 5 * 60 * 1000, // 5 минут
  gcTime: 24 * 60 * 60 * 1000, // 24 часа
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
}

/**
 * Все пресеты в одном объекте
 */
export const CACHE_PRESETS = {
  realtime: REALTIME_CACHE,
  standard: STANDARD_CACHE,
  static: STATIC_CACHE,
  offline: OFFLINE_CACHE,
} as const

export type CachePreset = keyof typeof CACHE_PRESETS
