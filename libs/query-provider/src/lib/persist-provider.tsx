'use client'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { type ReactNode, useState } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'
// Панель девтулзов подключается только так — почему `dynamic(ssr:false)` тут не работает,
// написано в самом модуле
import { DevtoolsPanel } from './devtools-panel-lazy'
import { createIDBPersister, type IDBPersisterOptions } from './idb-persister'

export interface PersistQueryProviderProps extends QueryClientConfig {
  children: ReactNode
  /**
   * Настройки IndexedDB персистера
   */
  persisterOptions?: IDBPersisterOptions
  /**
   * Максимальный возраст кэша в миллисекундах
   * @default 24 часа
   */
  maxAge?: number
  /**
   * Строка для инвалидации кэша (обычно BUILD_ID)
   * При изменении buster весь кэш сбрасывается
   */
  buster?: string
  /**
   * Показывать ли TanStack DevTools (Query + Form) — работает только в development.
   *
   * В production панели нет в сборке вовсе (см. `devtools-panel-lazy.tsx`), поэтому
   * `showDevtools: true` там ничего не включит. Флаг нужен, чтобы выключить панель в dev.
   *
   * @default true в development, false в production
   */
  showDevtools?: boolean
}

/**
 * QueryProvider с персистенцией в IndexedDB
 *
 * Сохраняет кэш TanStack Query между сессиями браузера,
 * что позволяет PWA приложениям работать оффлайн.
 *
 * @example
 * ```tsx
 * // Базовое использование для PWA
 * <PersistQueryProvider preset="offline">
 *   <App />
 * </PersistQueryProvider>
 *
 * // С кастомным ключом и buster'ом для инвалидации
 * <PersistQueryProvider
 *   preset="offline"
 *   persisterOptions={{ key: 'my-app-cache' }}
 *   buster={process.env.NEXT_PUBLIC_BUILD_ID}
 *   maxAge={7 * 24 * 60 * 60 * 1000} // 7 дней
 * >
 *   <App />
 * </PersistQueryProvider>
 * ```
 */
export function PersistQueryProvider({
  children,
  persisterOptions,
  maxAge = 24 * 60 * 60 * 1000, // 24 часа
  buster,
  showDevtools,
  ...config
}: PersistQueryProviderProps) {
  // Клиент создаётся ОДИН раз на монтирование провайдера. Голый `createQueryClient(config)`
  // в теле компонента выглядит безобидно, но выдаёт НОВЫЙ клиент на каждый ре-рендер — вместе с
  // ним обнуляется весь кеш и рвётся связь с оптимистичными правками: `setQueryData`/
  // `invalidateQueries` из уже запущенной мутации попадают в выброшенный клиент, а смонтированные
  // `useQuery` читают пустой новый. Внешне это выглядит как «первое действие применилось, а
  // следующие молча не доехали до экрана», хотя сервер отработал все.
  //
  // Ре-рендер здесь — не редкость: провайдер стоит в layout, поэтому его перерисовывает любая
  // мягкая навигация и любой `revalidatePath` из server action.
  // Для PWA по умолчанию используем offline пресет
  const [queryClient] = useState(() => createQueryClient({ preset: 'offline', ...config }))

  // Персистер тоже держит состояние (открытое соединение с IndexedDB) — пересоздавать его
  // на каждый ре-рендер незачем.
  const [persister] = useState(() => createIDBPersister(persisterOptions))

  const devtoolsEnabled = showDevtools ?? process.env.NODE_ENV === 'development'

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge,
        buster,
      }}
    >
      {children}
      {devtoolsEnabled && <DevtoolsPanel />}
    </PersistQueryClientProvider>
  )
}
