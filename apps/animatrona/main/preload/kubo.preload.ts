/**
 * Preload — Kubo (Go IPFS)
 *
 * Управление Kubo нодой.
 */

import { ipcRenderer } from 'electron'
import { on } from './ipc-helper'

/** Kubo (Go IPFS) */
export const kuboPreload = {
  /** Получить статус Kubo сервиса */
  status: (): Promise<{
    success: boolean
    data?: {
      isRunning: boolean
      mode: 'external' | 'embedded' | 'none'
      peerId: string | null
      apiUrl: string | null
      gatewayPort: number | null
      version: string | null
      connectedPeers: number
    }
    error?: string
  }> => ipcRenderer.invoke('kubo:status'),

  /** Запустить Kubo */
  start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('kubo:start'),

  /** Остановить Kubo */
  stop: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('kubo:stop'),

  /** Получить PeerId ноды */
  getPeerId: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('kubo:getPeerId'),

  /** Получить режим работы */
  getMode: (): Promise<{
    success: boolean
    data?: 'external' | 'embedded' | 'none'
    error?: string
  }> => ipcRenderer.invoke('kubo:getMode'),

  /** Получить URL Gateway */
  getGatewayUrl: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('kubo:getGatewayUrl'),

  /** Подписка на изменение статуса */
  onStatusChanged: on<
    [
      {
        isRunning: boolean
        mode: 'external' | 'embedded' | 'none'
        peerId: string | null
        apiUrl: string | null
        gatewayPort: number | null
        version: string | null
        connectedPeers: number
      },
    ]
  >('kubo:statusChanged'),

  /** Подписка на подключение пира */
  onPeerConnected: on<[string]>('kubo:peerConnected'),

  /** Подписка на отключение пира */
  onPeerDisconnected: on<[string]>('kubo:peerDisconnected'),

  /** Подписка на ошибки */
  onError: on<[string]>('kubo:error'),
}
