'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  // SSR всегда предполагает онлайн
  return true
}

/**
 * Хук для отслеживания статуса подключения к интернету
 *
 * Использует useSyncExternalStore для корректной работы с SSR.
 * Возвращает true когда онлайн, false когда оффлайн.
 *
 * @returns boolean — статус подключения
 *
 * @example
 * ```tsx
 * const isOnline = useOnlineStatus()
 *
 * if (!isOnline) {
 *   return <Banner>Вы оффлайн</Banner>
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
