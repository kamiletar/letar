'use client'

import { QueryProvider as BaseQueryProvider } from '@letar/query-provider'
import type { PropsWithChildren } from 'react'

/**
 * Cache time configurations для разных типов данных.
 * Используется в индивидуальных запросах через staleTime/gcTime.
 *
 * Оптимизации:
 * - gcTime уменьшен для снижения потребления памяти
 * - refetchOnWindowFocus отключен т.к. SSE обеспечивает realtime
 */
export const CACHE_CONFIG = {
  // Системные метрики меняются часто — минимальный кэш
  SYSTEM_METRICS: {
    staleTime: 5 * 1000, // 5 секунд
    gcTime: 10 * 1000, // 10 секунд (было 30) — снижение памяти
  },
  // Статус приложений меняется реже
  APP_STATUS: {
    staleTime: 10 * 1000, // 10 секунд
    gcTime: 60 * 1000, // 1 минута
  },
  // Git info меняется редко
  GIT_INFO: {
    staleTime: 30 * 1000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
  },
  // Docker info меняется умеренно
  DOCKER_INFO: {
    staleTime: 15 * 1000, // 15 секунд
    gcTime: 2 * 60 * 1000, // 2 минуты
  },
  // Статистика БД меняется нечасто
  DB_STATS: {
    staleTime: 30 * 1000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
  },
  // Алерты должны быть свежими
  ALERTS: {
    staleTime: 10 * 1000, // 10 секунд
    gcTime: 60 * 1000, // 1 минута
  },
  // История деплоев почти статична
  DEPLOY_HISTORY: {
    staleTime: 60 * 1000, // 1 минута
    gcTime: 10 * 60 * 1000, // 10 минут
  },
} as const

/**
 * QueryProvider для Dashboard
 *
 * Оптимизации памяти:
 * - refetchOnWindowFocus: false — SSE обеспечивает realtime обновления
 * - Уменьшенный gcTime для быстрой очистки неиспользуемых данных
 * - DevTools включены в development
 *
 * Для специфичных запросов используй CACHE_CONFIG выше.
 */
export const QueryProvider = ({ children }: PropsWithChildren) => {
  return (
    <BaseQueryProvider
      preset="realtime"
      defaultOptions={{
        queries: {
          // SSE обеспечивает realtime — не нужно перезапрашивать при фокусе
          refetchOnWindowFocus: false,
        },
      }}
    >
      {children}
    </BaseQueryProvider>
  )
}
