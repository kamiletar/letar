/**
 * Multi-server store для Animatrona Mobile
 *
 * Хранит массив серверов (Desktop + Tracker) и активный сервер.
 * При первом запуске мигрирует данные из старого 'animatrona-connection'.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ServerConfig, ServerType } from '@/types/server'

console.log('[servers.ts] v0.7.0 — multi-server store загружен')

/** Генерация уникального ID (простой nanoid-подобный) */
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export interface ServersState {
  /** Все сконфигурированные серверы */
  servers: ServerConfig[]
  /** ID активного сервера */
  activeServerId: string | null
  /** Статус подключения к активному серверу */
  connectionStatus: 'idle' | 'checking' | 'connected' | 'error'
  /** Сообщение об ошибке */
  errorMessage: string | null
  /** Мигрирован ли старый формат */
  migrated: boolean

  // Computed
  /** Активный сервер (shortcut) */
  readonly activeServer: ServerConfig | null

  // Actions
  /** Добавить сервер */
  addServer: (params: { name: string; type: ServerType; url: string; apiKey?: string }) => ServerConfig
  /** Удалить сервер */
  removeServer: (id: string) => void
  /** Обновить сервер */
  updateServer: (id: string, updates: Partial<Pick<ServerConfig, 'name' | 'url' | 'apiKey'>>) => void
  /** Установить активный сервер */
  setActiveServer: (id: string | null) => void
  /** Установить статус подключения */
  setConnectionStatus: (status: ServersState['connectionStatus'], error?: string) => void
  /** Проверить подключение к активному серверу */
  checkConnection: () => Promise<boolean>
}

export const useServersStore = create<ServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      activeServerId: null,
      connectionStatus: 'idle',
      errorMessage: null,
      migrated: false,

      get activeServer() {
        const { servers, activeServerId } = get()
        return servers.find((s) => s.id === activeServerId) ?? null
      },

      addServer: ({ name, type, url, apiKey }) => {
        const server: ServerConfig = {
          id: generateId(),
          name,
          type,
          url,
          apiKey,
        }
        set((state) => ({
          servers: [...state.servers, server],
          // Если это первый сервер — сразу активируем
          activeServerId: state.servers.length === 0 ? server.id : state.activeServerId,
        }))
        return server
      },

      removeServer: (id) => {
        set((state) => {
          const newServers = state.servers.filter((s) => s.id !== id)
          return {
            servers: newServers,
            // Если удалили активный — переключаемся на первый оставшийся
            activeServerId: state.activeServerId === id ? (newServers[0]?.id ?? null) : state.activeServerId,
            connectionStatus: state.activeServerId === id ? 'idle' : state.connectionStatus,
          }
        })
      },

      updateServer: (id, updates) => {
        set((state) => ({
          servers: state.servers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }))
      },

      setActiveServer: (id) => {
        set({
          activeServerId: id,
          connectionStatus: 'idle',
          errorMessage: null,
        })
      },

      setConnectionStatus: (status, error) => {
        set({
          connectionStatus: status,
          errorMessage: error ?? null,
        })
      },

      checkConnection: async () => {
        const state = get()
        const server = state.servers.find((s) => s.id === state.activeServerId)
        if (!server) {
          set({ connectionStatus: 'error', errorMessage: 'Нет активного сервера' })
          return false
        }

        set({ connectionStatus: 'checking' })

        try {
          const headers: Record<string, string> = { Accept: 'application/json' }
          if (server.type === 'tracker' && server.apiKey) {
            headers['Authorization'] = `Bearer ${server.apiKey}`
          }

          // Для Desktop проверяем /api/status, для Tracker — /api/anime?limit=1
          const endpoint = server.type === 'desktop' ? `${server.url}/api/status` : `${server.url}/api/anime?limit=1`
          console.log('[servers] checkConnection →', endpoint)

          const response = await fetch(endpoint, { method: 'GET', headers })
          console.log('[servers] checkConnection response:', response.status)

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Неверный API Key')
            }
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()

          // Desktop: проверяем server.isRunning, Tracker: если вернул data — ОК
          if (server.type === 'desktop' && !data.server?.isRunning) {
            throw new Error('Сервер не запущен')
          }

          set({
            connectionStatus: 'connected',
            errorMessage: null,
          })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Ошибка соединения'
          set({
            connectionStatus: 'error',
            errorMessage: message,
          })
          return false
        }
      },
    }),
    {
      name: 'animatrona-servers',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        servers: state.servers,
        activeServerId: state.activeServerId,
        migrated: state.migrated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // После гидрации — мигрируем старый формат если нужно
          if (state && !state.migrated) {
            void migrateFromOldFormat(state)
          }
        }
      },
    }
  )
)

/**
 * Миграция из старого формата 'animatrona-connection'
 *
 * Читает старый ключ, создаёт ServerConfig { type: 'desktop' },
 * отмечает migrated = true, удаляет старый ключ.
 */
async function migrateFromOldFormat(store: ServersState) {
  try {
    const oldData = await AsyncStorage.getItem('animatrona-connection')
    if (oldData) {
      const parsed = JSON.parse(oldData)
      const connection = parsed?.state?.connection
      if (connection?.serverUrl) {
        const server = store.addServer({
          name: 'Desktop',
          type: 'desktop',
          url: connection.serverUrl,
        })
        store.setActiveServer(server.id)
        console.log('[servers] Мигрирован Desktop сервер:', connection.serverUrl)
      }
      // Удаляем старый ключ
      await AsyncStorage.removeItem('animatrona-connection')
    }
    // Отмечаем миграцию завершённой
    useServersStore.setState({ migrated: true })
  } catch (error) {
    console.warn('[servers] Ошибка миграции:', error)
    useServersStore.setState({ migrated: true })
  }
}
