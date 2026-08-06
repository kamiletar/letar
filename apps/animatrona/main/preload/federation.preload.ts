/**
 * Preload — Federation (Tracker Sync)
 *
 * Федерация трекеров, синхронизация контента.
 */

import { ipcRenderer } from 'electron'
import type {
  AddTrackerOptions,
  DiscoverResult,
  FederationOperationResult,
  FederationSettings,
  GlobalSeederStats,
  SyncOptions,
  SyncResult,
  TrackerInfo,
  TrustLevel,
} from '../../shared/types/federation'

/** Federation (Tracker Sync) */
export const federationPreload = {
  /** Получить настройки федерации */
  getSettings: (): Promise<FederationOperationResult<FederationSettings>> =>
    ipcRenderer.invoke('federation:getSettings'),

  /** Обновить настройки федерации */
  updateSettings: (
    update: Partial<Omit<FederationSettings, 'hasPrivateKey'>>,
  ): Promise<FederationOperationResult<FederationSettings>> => ipcRenderer.invoke('federation:updateSettings', update),

  /** Сгенерировать ключи для HTTP Signatures */
  generateKeys: (): Promise<FederationOperationResult<{ publicKeyPem: string }>> =>
    ipcRenderer.invoke('federation:generateKeys'),

  /** Обнаружить трекер по URL (WebFinger) */
  discover: (url: string): Promise<FederationOperationResult<DiscoverResult>> =>
    ipcRenderer.invoke('federation:discover', url),

  /** Получить список известных трекеров */
  listTrackers: (): Promise<FederationOperationResult<TrackerInfo[]>> => ipcRenderer.invoke('federation:listTrackers'),

  /** Добавить трекер */
  addTracker: (options: AddTrackerOptions): Promise<FederationOperationResult<TrackerInfo>> =>
    ipcRenderer.invoke('federation:addTracker', options),

  /** Удалить трекер */
  removeTracker: (trackerId: string): Promise<FederationOperationResult<void>> =>
    ipcRenderer.invoke('federation:removeTracker', trackerId),

  /** Обновить информацию о трекере */
  refreshTracker: (trackerId: string): Promise<FederationOperationResult<TrackerInfo>> =>
    ipcRenderer.invoke('federation:refreshTracker', trackerId),

  /** Установить уровень доверия трекера */
  setTrust: (trackerId: string, trustLevel: TrustLevel): Promise<FederationOperationResult<TrackerInfo>> =>
    ipcRenderer.invoke('federation:setTrust', trackerId, trustLevel),

  /** Заблокировать трекер */
  blockTracker: (trackerId: string): Promise<FederationOperationResult<void>> =>
    ipcRenderer.invoke('federation:blockTracker', trackerId),

  /** Разблокировать трекер */
  unblockTracker: (trackerId: string): Promise<FederationOperationResult<void>> =>
    ipcRenderer.invoke('federation:unblockTracker', trackerId),

  /** Синхронизировать контент с трекером */
  sync: (trackerId: string, options?: SyncOptions): Promise<FederationOperationResult<SyncResult>> =>
    ipcRenderer.invoke('federation:sync', trackerId, options),

  /** Синхронизировать со всеми доверенными трекерами */
  syncAll: (options?: SyncOptions): Promise<FederationOperationResult<SyncResult[]>> =>
    ipcRenderer.invoke('federation:syncAll', options),

  /** Получить глобальную статистику сидеров для CID */
  getGlobalSeeders: (cid: string): Promise<FederationOperationResult<GlobalSeederStats>> =>
    ipcRenderer.invoke('federation:getGlobalSeeders', cid),

  /** Получить trust score трекера */
  getTrustScore: (trackerId: string): Promise<FederationOperationResult<number>> =>
    ipcRenderer.invoke('federation:getTrustScore', trackerId),
}
