/**
 * Zustand store для оффлайн-режима
 *
 * Отслеживает доступность сервера и текущий режим работы.
 * Отделён от connection store — connection хранит данные подключения (QR),
 * а offline отслеживает фактическую доступность сервера в реальном времени.
 */

import { create } from 'zustand'

export type OfflineMode = 'online' | 'offline'

interface OfflineState {
  /** Доступен ли сервер (последний запрос успешен) */
  isServerReachable: boolean
  /** Время последнего успешного контакта с сервером */
  lastServerContact: number | null
  /** Текущий режим: online (сервер доступен) / offline (используем кэш) */
  mode: OfflineMode

  // Actions
  /** Отметить сервер как доступный */
  setServerReachable: () => void
  /** Отметить сервер как недоступный */
  setServerUnreachable: () => void
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isServerReachable: false,
  lastServerContact: null,
  mode: 'offline',

  setServerReachable: () => {
    set({
      isServerReachable: true,
      lastServerContact: Date.now(),
      mode: 'online',
    })
  },

  setServerUnreachable: () => {
    set({
      isServerReachable: false,
      mode: 'offline',
    })
  },
}))
