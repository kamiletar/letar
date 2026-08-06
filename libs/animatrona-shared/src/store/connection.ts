/**
 * Фабрика Zustand store для подключения к Animatrona Desktop
 *
 * Создаёт store с уникальным storage key для каждого приложения
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Данные подключения из QR-кода */
export interface ConnectionData {
  /** URL сервера (например, "http://192.168.1.100:3100") */
  serverUrl: string
  /** Название устройства (опционально) */
  deviceName?: string
  /** Версия протокола */
  version?: string
}

export interface ConnectionState {
  /** Данные подключения */
  connection: ConnectionData | null
  /** Подключено ли */
  isConnected: boolean
  /** Статус проверки соединения */
  connectionStatus: 'idle' | 'checking' | 'connected' | 'error'
  /** Сообщение об ошибке */
  errorMessage: string | null
  /** Последняя проверка соединения */
  lastChecked: number | null

  // Actions
  /** Установить подключение */
  setConnection: (data: ConnectionData) => void
  /** Отключиться */
  disconnect: () => void
  /** Установить статус */
  setStatus: (status: ConnectionState['connectionStatus'], error?: string) => void
  /** Проверить соединение */
  checkConnection: () => Promise<boolean>
}

/**
 * Создать connection store с указанным ключом хранилища
 *
 * @param storageKey — уникальный ключ для persist (например, 'animatrona-connection')
 */
export function createConnectionStore(storageKey: string) {
  return create<ConnectionState>()(
    persist(
      (set, get) => ({
        connection: null,
        isConnected: false,
        connectionStatus: 'idle',
        errorMessage: null,
        lastChecked: null,

        setConnection: (data) => {
          set({
            connection: data,
            isConnected: true,
            connectionStatus: 'connected',
            errorMessage: null,
            lastChecked: Date.now(),
          })
        },

        disconnect: () => {
          set({
            connection: null,
            isConnected: false,
            connectionStatus: 'idle',
            errorMessage: null,
          })
        },

        setStatus: (status, error) => {
          set({
            connectionStatus: status,
            errorMessage: error ?? null,
            isConnected: status === 'connected',
          })
        },

        checkConnection: async () => {
          const { connection } = get()
          if (!connection) {
            set({ connectionStatus: 'error', errorMessage: 'Нет данных подключения' })
            return false
          }

          set({ connectionStatus: 'checking' })

          try {
            const response = await fetch(`${connection.serverUrl}/api/status`, {
              method: 'GET',
              headers: { Accept: 'application/json' },
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()

            if (data.server?.isRunning) {
              set({
                connectionStatus: 'connected',
                isConnected: true,
                errorMessage: null,
                lastChecked: Date.now(),
              })
              return true
            } else {
              throw new Error('Сервер не запущен')
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка соединения'
            set({
              connectionStatus: 'error',
              isConnected: false,
              errorMessage: message,
            })
            return false
          }
        },
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          connection: state.connection,
          // Не сохраняем isConnected — проверяем при запуске
        }),
      },
    ),
  )
}
