/**
 * Совместимая обёртка connection store
 *
 * Маппит multi-server store в старый формат ConnectionData
 * для обратной совместимости с shared библиотекой и экранами.
 */

import { useServersStore } from './servers'

import type { ConnectionData, ConnectionState } from '@letar/animatrona-shared'

export type { ConnectionData, ConnectionState } from '@letar/animatrona-shared'

/**
 * Совместимый connection store
 *
 * Проксирует вызовы к useServersStore, предоставляя
 * старый интерфейс ConnectionState для shared API клиента.
 */
export const useConnectionStore = {
  getState: (): Pick<ConnectionState, 'connection' | 'isConnected' | 'connectionStatus'> => {
    const state = useServersStore.getState()
    const server = state.servers.find((s) => s.id === state.activeServerId)
    return {
      connection: server ? ({ serverUrl: server.url } as ConnectionData) : null,
      isConnected: state.connectionStatus === 'connected',
      connectionStatus: state.connectionStatus,
    }
  },

  /** Zustand persist совместимость */
  persist: useServersStore.persist,

  /** Подписка на изменения (для useConnectionStore(selector)) */
  subscribe: useServersStore.subscribe,
}
