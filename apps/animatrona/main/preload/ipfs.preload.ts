/**
 * Preload — IPFS (Helia)
 *
 * Нода, контент, gateway, pinning, IPNS, подписки, публикация,
 * remote pinning (Pinata), планировщик, tracker.
 */

import { ipcRenderer } from 'electron'
import type {
  IpfsAddResult,
  IpfsStatResult,
  IpnsPublishResult,
  IpnsResolveResult,
  P2PDiagnostics,
  PinInfo,
  PinStats,
  PublishedLibrary,
  PublisherConfig,
  PublishProgress,
  PublishResult,
  SchedulerConfig,
  SchedulerStatus,
  Subscription,
  SubscriptionCreateData,
  SubscriptionRefreshResult,
} from '../../shared/types/ipfs'
import type {
  PinataConfig,
  PinataPinJob,
  PinataStats,
  RemotePin,
  RemotePinConfig,
  RemotePinOptions,
} from '../../shared/types/remote-pinning'
import { on } from './ipc-helper'

/** IPFS (Helia) */
export const ipfsPreload = {
  /** Получить статус ноды */
  status: (): Promise<{
    success: boolean
    data?: {
      isRunning: boolean
      peerId: string | null
      connectedPeers: number
      bytesIn: number
      bytesOut: number
      blockstoreSize: number
    }
    error?: string
  }> => ipcRenderer.invoke('ipfs:status'),

  /** Получить P2P диагностику (inbound/outbound, транспорты, адреса) */
  diagnostics: (): Promise<{
    success: boolean
    data?: P2PDiagnostics | null
    error?: string
  }> => ipcRenderer.invoke('ipfs:diagnostics'),

  /** Получить PeerId текущей ноды */
  getPeerId: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('ipfs:getPeerId'),

  /** Запустить ноду */
  start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('ipfs:start'),

  /** Остановить ноду */
  stop: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('ipfs:stop'),

  /** Подписка на изменение статуса */
  onStatusChanged: on<
    [
      {
        isRunning: boolean
        peerId: string | null
        connectedPeers: number
        bytesIn: number
        bytesOut: number
        blockstoreSize: number
      },
    ]
  >('ipfs:statusChanged'),

  /** Подписка на подключение пира */
  onPeerConnected: on<[string]>('ipfs:peerConnected'),

  /** Подписка на отключение пира */
  onPeerDisconnected: on<[string]>('ipfs:peerDisconnected'),

  /** Подписка на ошибки */
  onError: on<[string]>('ipfs:error'),

  // === Операции с контентом ===

  /** Добавить файл в IPFS */
  addFile: (filePath: string): Promise<{ success: boolean; data?: IpfsAddResult; error?: string }> =>
    ipcRenderer.invoke('ipfs:addFile', filePath),

  /** Добавить директорию в IPFS */
  addDirectory: (
    dirPath: string,
    recursive = true,
  ): Promise<{ success: boolean; data?: { files: IpfsAddResult[]; rootCid: string }; error?: string }> =>
    ipcRenderer.invoke('ipfs:addDirectory', dirPath, recursive),

  /** Прочитать контент по CID (возвращает base64) */
  cat: (cid: string): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('ipfs:cat', cid),

  /** Получить статистику по CID */
  stat: (cid: string): Promise<{ success: boolean; data?: IpfsStatResult; error?: string }> =>
    ipcRenderer.invoke('ipfs:stat', cid),

  /** Проверить наличие контента локально */
  has: (cid: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('ipfs:has', cid),

  /** Сохранить контент из IPFS в файл */
  saveToFile: (cid: string, outputPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ipfs:saveToFile', cid, outputPath),

  // === Kubo Gateway (прямой доступ) ===

  /** Получить URL Kubo gateway (для прямого доступа к IPFS контенту из renderer) */
  kuboGetGatewayUrl: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('kubo:getGatewayUrl'),

  // === Repo ===

  /** Запустить Garbage Collection — удалить неиспользуемые блоки */
  repoGc: (): Promise<{ success: boolean; data?: { blocksRemoved: number }; error?: string }> =>
    ipcRenderer.invoke('ipfs:repoGc'),

  // === Pinning ===

  /** Закрепить контент */
  pin: (cid: string, name?: string): Promise<{ success: boolean; data?: PinInfo; error?: string }> =>
    ipcRenderer.invoke('ipfs:pin', cid, name),

  /** Открепить контент */
  unpin: (cid: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('ipfs:unpin', cid),

  /** Проверить, закреплён ли контент */
  isPinned: (cid: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('ipfs:isPinned', cid),

  /** Получить информацию о pin */
  getPin: (cid: string): Promise<{ success: boolean; data?: PinInfo | null; error?: string }> =>
    ipcRenderer.invoke('ipfs:getPin', cid),

  /** Список всех pins */
  listPins: (): Promise<{ success: boolean; data?: PinInfo[]; error?: string }> => ipcRenderer.invoke('ipfs:listPins'),

  /** Статистика pins */
  pinStats: (): Promise<{ success: boolean; data?: PinStats; error?: string }> => ipcRenderer.invoke('ipfs:pinStats'),

  /** Переименовать pin */
  renamePin: (cid: string, name: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('ipfs:renamePin', cid, name),

  /** Аудит: найти осиротевшие pins (pinned, но не referenced в библиотеке) */
  findOrphanedPins: (): Promise<{
    success: boolean
    data?: {
      dbCids: string[]
      referencedCids: string[]
      pinnedCids: string[]
      orphanedPins: PinInfo[]
      missingPins: string[]
      errors: string[]
    }
    error?: string
  }> => ipcRenderer.invoke('ipfs:findOrphanedPins'),

  /** Подписка на прогресс аудита */
  onAuditProgress: (callback: (data: { current: number; total: number; name: string }) => void): () => void => {
    const handler = (_event: Electron.IpcRendererEvent, data: { current: number; total: number; name: string }) =>
      callback(data)
    ipcRenderer.on('ipfs:auditProgress', handler)
    return () => ipcRenderer.removeListener('ipfs:auditProgress', handler)
  },

  /** Подписка на шаги аудита (текстовое описание текущего шага) */
  onAuditStep: (callback: (data: { step: string }) => void): () => void => {
    const handler = (_event: Electron.IpcRendererEvent, data: { step: string }) => callback(data)
    ipcRenderer.on('ipfs:auditStep', handler)
    return () => ipcRenderer.removeListener('ipfs:auditStep', handler)
  },

  /** Массовое удаление recursive pin'ов (параллельно, со стрим-прогрессом) */
  bulkUnpin: (
    cids: string[],
  ): Promise<{
    success: boolean
    data?: { unpinned: number; failed: number; total: number }
    error?: string
  }> => ipcRenderer.invoke('ipfs:bulkUnpin', cids),

  /** Подписка на прогресс массового удаления */
  onBulkUnpinProgress: (callback: (data: { current: number; total: number }) => void): () => void => {
    const handler = (_event: Electron.IpcRendererEvent, data: { current: number; total: number }) => callback(data)
    ipcRenderer.on('ipfs:bulkUnpinProgress', handler)
    return () => ipcRenderer.removeListener('ipfs:bulkUnpinProgress', handler)
  },

  /** Нормализация pins — снять recursive pin с дочерних CID directoryCid'ов (одноразовая чистка) */
  normalizePins: (): Promise<{
    success: boolean
    data?: {
      unpinned: number
      kept: number
      errors: number
      directoriesProcessed: number
      directoriesFailed: number
    }
    error?: string
  }> => ipcRenderer.invoke('ipfs:normalizePins'),

  /** Подписка на шаги нормализации pins */
  onNormalizeStep: (callback: (data: { step: string; current?: number; total?: number }) => void): () => void => {
    const handler = (_event: Electron.IpcRendererEvent, data: { step: string; current?: number; total?: number }) =>
      callback(data)
    ipcRenderer.on('ipfs:normalizeStep', handler)
    return () => ipcRenderer.removeListener('ipfs:normalizeStep', handler)
  },

  /** PeerSync: получить статус (список peers, lastSync, source) */
  getSyncedPeers: (): Promise<{
    success: boolean
    data?: {
      peers: Array<{
        id: string
        name: string
        role: 'pinner' | 'relay' | 'gateway'
        peerId: string
        multiaddrs: string[]
        peeringRole: 'bootstrap' | 'peering' | 'both'
      }>
      lastSyncAt: number | null
      lastResponseUpdatedAt: string | null
      lastReconnectAt: number | null
      source: 'api' | 'cache' | 'hardcoded'
      lastError: string | null
    }
    error?: string
  }> => ipcRenderer.invoke('kubo:getSyncedPeers'),

  /** PeerSync: форсированный sync с применением к Kubo */
  forceSyncPeers: (): Promise<{
    success: boolean
    data?: {
      success: boolean
      source: string
      peersCount: number
      addedCount: number
      removedCount: number
      error?: string
    }
    error?: string
  }> => ipcRenderer.invoke('kubo:forceSyncPeers'),

  /** PeerSync: форсированный reconnect cycle (для отладки) */
  forceReconnect: (): Promise<{
    success: boolean
    data?: { success: boolean; error?: string }
    error?: string
  }> => ipcRenderer.invoke('kubo:forceReconnect'),

  /** Закрепить missing pins (referenced в БД, но не в Kubo) */
  pinMissing: (
    cids: string[],
  ): Promise<{
    success: boolean
    data?: { pinned: number; failed: number }
    error?: string
  }> => ipcRenderer.invoke('ipfs:pinMissing', cids),

  /** Подписка на закрепление контента */
  onPinned: on<[PinInfo]>('ipfs:pinned'),

  /** Подписка на открепление контента */
  onUnpinned: on<[PinInfo]>('ipfs:unpinned'),

  // === IPNS ===

  /** Опубликовать CID под IPNS именем текущей ноды */
  ipnsPublish: (
    cid: string,
    lifetime?: string,
  ): Promise<{ success: boolean; data?: IpnsPublishResult; error?: string }> =>
    ipcRenderer.invoke('ipns:publish', cid, lifetime),

  /** Разрешить IPNS имя в CID */
  ipnsResolve: (name: string): Promise<{ success: boolean; data?: IpnsResolveResult; error?: string }> =>
    ipcRenderer.invoke('ipns:resolve', name),

  /** Получить IPNS имя текущей ноды (PeerId) */
  ipnsGetName: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('ipns:getName'),

  /** Переопубликовать все IPNS записи (продление срока жизни) */
  ipnsRepublish: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('ipns:republish'),

  /** Подписка на публикацию IPNS */
  onIpnsPublished: on<[IpnsPublishResult]>('ipns:published'),

  /** Подписка на разрешение IPNS */
  onIpnsResolved: on<[{ name: string } & IpnsResolveResult]>('ipns:resolved'),

  // === P2P Sharing (Subscriptions) ===

  /** Получить список всех подписок */
  subscriptionList: (): Promise<{ success: boolean; data?: Subscription[]; error?: string }> =>
    ipcRenderer.invoke('subscription:list'),

  /** Получить подписку по ID */
  subscriptionGet: (id: string): Promise<{ success: boolean; data?: Subscription | null; error?: string }> =>
    ipcRenderer.invoke('subscription:get', id),

  /** Добавить подписку */
  subscriptionAdd: (data: SubscriptionCreateData): Promise<{ success: boolean; data?: Subscription; error?: string }> =>
    ipcRenderer.invoke('subscription:add', data),

  /** Удалить подписку */
  subscriptionRemove: (id: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('subscription:remove', id),

  /** Обновить настройки подписки */
  subscriptionUpdate: (
    id: string,
    data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit'>>,
  ): Promise<{ success: boolean; data?: Subscription | null; error?: string }> =>
    ipcRenderer.invoke('subscription:update', id, data),

  /** Обновить данные подписки (проверить IPNS) */
  subscriptionRefresh: (id: string): Promise<{ success: boolean; data?: SubscriptionRefreshResult; error?: string }> =>
    ipcRenderer.invoke('subscription:refresh', id),

  /** Обновить все подписки */
  subscriptionRefreshAll: (): Promise<{ success: boolean; data?: SubscriptionRefreshResult[]; error?: string }> =>
    ipcRenderer.invoke('subscription:refreshAll'),

  /** Загрузить библиотеку подписки из IPFS по lastKnownCid */
  subscriptionFetchLibrary: (
    id: string,
  ): Promise<{ success: boolean; data?: PublishedLibrary | null; error?: string }> =>
    ipcRenderer.invoke('subscription:fetchLibrary', id),

  /** Подписка на добавление подписки */
  onSubscriptionAdded: on<[Subscription]>('subscription:added'),

  /** Подписка на удаление подписки */
  onSubscriptionRemoved: on<[Subscription]>('subscription:removed'),

  /** Подписка на обновление подписки */
  onSubscriptionUpdated: on<[Subscription]>('subscription:updated'),

  /** Подписка на обновление данных подписки (refresh) */
  onSubscriptionRefreshed: on<[SubscriptionRefreshResult]>('subscription:refreshed'),

  /** Подписка на обновление всех подписок */
  onSubscriptionAllRefreshed: on<[SubscriptionRefreshResult[]]>('subscription:allRefreshed'),

  // === Library Publishing ===

  /** Получить конфигурацию публикации */
  publisherGetConfig: (): Promise<{ success: boolean; data?: PublisherConfig; error?: string }> =>
    ipcRenderer.invoke('publisher:getConfig'),

  /** Обновить конфигурацию публикации */
  publisherUpdateConfig: (
    updates: Partial<PublisherConfig>,
  ): Promise<{ success: boolean; data?: PublisherConfig; error?: string }> =>
    ipcRenderer.invoke('publisher:updateConfig', updates),

  /** Опубликовать библиотеку (автоматически получает данные из БД) */
  publisherPublish: (): Promise<{ success: boolean; data?: PublishResult; error?: string }> =>
    ipcRenderer.invoke('publisher:publish'),

  /** Получить количество аниме для публикации */
  publisherGetAnimeCount: (): Promise<{
    success: boolean
    data?: { animeCount: number; episodeCount: number }
    error?: string
  }> => ipcRenderer.invoke('publisher:getAnimeCount'),

  /** Получить опубликованную библиотеку */
  publisherGetPublished: (): Promise<{ success: boolean; data?: PublishedLibrary | null; error?: string }> =>
    ipcRenderer.invoke('publisher:getPublished'),

  /** Подписка на прогресс публикации */
  onPublisherProgress: on<[PublishProgress]>('publisher:progress'),

  /** Подписка на завершение публикации */
  onPublisherPublished: on<[PublishResult]>('publisher:published'),

  /** Подписка на обновление конфигурации */
  onPublisherConfigUpdated: on<[PublisherConfig]>('publisher:configUpdated'),

  // === Миграция и очистка библиотеки ===

  /** Получить количество эпизодов для миграции в IPFS */
  publisherGetMigrationCount: (): Promise<{ success: boolean; data?: { count: number }; error?: string }> =>
    ipcRenderer.invoke('publisher:getMigrationCount'),

  /** Мигрировать контент в IPFS */
  publisherMigrateToIpfs: (): Promise<{
    success: boolean
    data?: {
      total: number
      migrated: number
      failed: number
      errors: Array<{ episodeId: string; animeName: string; episodeNumber: number; error: string }>
    }
    error?: string
  }> => ipcRenderer.invoke('publisher:migrateToIpfs'),

  /** Подписка на прогресс миграции */
  onPublisherMigrationProgress: on<[{ current: number; total: number; animeName: string; episodeNumber: number }]>(
    'publisher:migrationProgress',
  ),

  /** Регенерировать все EpisodeManifest (заменить локальные пути на CID'ы из БД) */
  publisherRegenerateManifests: (): Promise<{
    success: boolean
    data?: {
      total: number
      updated: number
      skipped: number
      failed: number
      errors: Array<{ episodeId: string; animeName: string; episodeNumber: number; error: string }>
      affectedAnimeIds: string[]
    }
    error?: string
  }> => ipcRenderer.invoke('publisher:regenerateManifests'),

  /** Точечная регенерация EpisodeManifest + AnimeManifest + directoryCid для одного аниме */
  regenerateForAnime: (
    animeId: string,
  ): Promise<{
    success: boolean
    data?: { updated: number; failed: number }
    error?: string
  }> => ipcRenderer.invoke('publisher:regenerateForAnime', animeId),

  /** Подписка на прогресс регенерации манифестов */
  onPublisherRegenerateProgress: on<[{ current: number; total: number; animeName: string; episodeNumber: number }]>(
    'publisher:regenerateProgress',
  ),

  /** Удалить контент конкретного аниме из IPFS (вызывать ПЕРЕД удалением из БД) */
  publisherDeleteAnimeContent: (
    animeId: string,
  ): Promise<{ success: boolean; data?: { deletedCids: number; cids: string[] }; error?: string }> =>
    ipcRenderer.invoke('publisher:deleteAnimeContent', animeId),

  /** Очистить библиотеку (удалить все аниме из БД и IPFS) */
  publisherClearLibrary: (): Promise<{
    success: boolean
    data?: { deletedCount: number; deletedBytes: number }
    error?: string
  }> => ipcRenderer.invoke('publisher:clearLibrary'),

  // === Tracker Integration ===

  /** Получить конфигурацию tracker */
  trackerGetConfig: (): Promise<{
    success: boolean
    data?: { baseUrl: string; apiKey: string; enabled: boolean }
    error?: string
  }> => ipcRenderer.invoke('tracker:getConfig'),

  /** Обновить конфигурацию tracker */
  trackerUpdateConfig: (updates: {
    baseUrl?: string
    apiKey?: string
    enabled?: boolean
  }): Promise<{
    success: boolean
    data?: { baseUrl: string; apiKey: string; enabled: boolean }
    error?: string
  }> => ipcRenderer.invoke('tracker:updateConfig', updates),

  /** Проверить подключение к tracker */
  trackerTestConnection: (): Promise<{
    success: boolean
    data?: { success: boolean; message: string; trackerName?: string }
    error?: string
  }> => ipcRenderer.invoke('tracker:testConnection'),

  /** Опубликовать аниме на tracker по directoryCid */
  trackerPublish: (
    directoryCid: string,
  ): Promise<{
    success: boolean
    data?: {
      success: boolean
      animeId?: string
      status?: string
      episodeCount?: number
      error?: string
      isReplacement?: boolean
      replacesAnimeId?: string
    }
    error?: string
  }> => ipcRenderer.invoke('tracker:publish', directoryCid),

  /** Получить список активных раздач */
  trackerGetDistributions: (): Promise<{
    success: boolean
    data?: Array<{
      id: string
      cid: string
      peerId: string
      animeId?: string
      size: number
      status: string
    }>
    error?: string
  }> => ipcRenderer.invoke('tracker:getDistributions'),

  /** Пакетная публикация аниме на tracker */
  trackerBatchPublish: (
    items: Array<{ directoryCid: string; animeName: string }>,
  ): Promise<{
    success: boolean
    data?: {
      total: number
      successCount: number
      errorCount: number
      cancelledCount: number
      results: Array<{
        directoryCid: string
        animeName: string
        result: {
          success: boolean
          animeId?: string
          status?: string
          episodeCount?: number
          error?: string
          isReplacement?: boolean
          replacesAnimeId?: string
        }
      }>
    }
    error?: string
  }> => ipcRenderer.invoke('tracker:batchPublish', items),

  /** Отменить пакетную публикацию */
  trackerCancelBatch: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('tracker:cancelBatch'),

  /** Подписка на прогресс пакетной публикации */
  onTrackerBatchProgress: on<
    [
      {
        current: number
        total: number
        currentAnimeName: string
        currentDirectoryCid: string
        result?: {
          success: boolean
          animeId?: string
          status?: string
          episodeCount?: number
          error?: string
          isReplacement?: boolean
          replacesAnimeId?: string
        }
      },
    ]
  >('tracker:batchProgress'),

  // === Subscription Scheduler ===

  /** Получить статус планировщика */
  schedulerGetStatus: (): Promise<{ success: boolean; data?: SchedulerStatus; error?: string }> =>
    ipcRenderer.invoke('scheduler:getStatus'),

  /** Получить конфигурацию планировщика */
  schedulerGetConfig: (): Promise<{ success: boolean; data?: SchedulerConfig; error?: string }> =>
    ipcRenderer.invoke('scheduler:getConfig'),

  /** Обновить конфигурацию планировщика */
  schedulerUpdateConfig: (
    updates: Partial<SchedulerConfig>,
  ): Promise<{ success: boolean; data?: SchedulerConfig; error?: string }> =>
    ipcRenderer.invoke('scheduler:updateConfig', updates),

  /** Запустить планировщик */
  schedulerStart: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('scheduler:start'),

  /** Остановить планировщик */
  schedulerStop: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('scheduler:stop'),

  /** Проверить подписки сейчас */
  schedulerCheckNow: (): Promise<{ success: boolean; data?: SubscriptionRefreshResult[]; error?: string }> =>
    ipcRenderer.invoke('scheduler:checkNow'),

  /** Подписка на изменение статуса планировщика */
  onSchedulerStatusChanged: on<[SchedulerStatus]>('scheduler:statusChanged'),

  /** Подписка на обновление конфигурации планировщика */
  onSchedulerConfigUpdated: on<[SchedulerConfig]>('scheduler:configUpdated'),

  /** Подписка на результаты проверки подписок */
  onSchedulerChecked: on<[SubscriptionRefreshResult[]]>('scheduler:checked'),

  // === Remote Pinning (Pinata) ===

  /** Получить конфигурацию remote pinning */
  remotePinGetConfig: (): Promise<{ success: boolean; data?: RemotePinConfig; error?: string }> =>
    ipcRenderer.invoke('remotePin:getConfig'),

  /** Обновить конфигурацию remote pinning */
  remotePinUpdateConfig: (
    updates: Partial<RemotePinConfig>,
  ): Promise<{ success: boolean; data?: RemotePinConfig; error?: string }> =>
    ipcRenderer.invoke('remotePin:updateConfig', updates),

  /** Обновить конфигурацию Pinata */
  remotePinUpdatePinataConfig: (
    updates: Partial<PinataConfig>,
  ): Promise<{ success: boolean; data?: RemotePinConfig; error?: string }> =>
    ipcRenderer.invoke('remotePin:updatePinataConfig', updates),

  /** Проверить JWT токен Pinata */
  remotePinTestAuth: (jwt: string): Promise<{ success: boolean; data?: { valid: boolean }; error?: string }> =>
    ipcRenderer.invoke('remotePin:testAuth', jwt),

  /** Закрепить CID на Pinata */
  remotePinPin: (
    cid: string,
    options?: RemotePinOptions,
  ): Promise<{ success: boolean; data?: PinataPinJob; error?: string }> =>
    ipcRenderer.invoke('remotePin:pin', cid, options),

  /** Открепить CID с Pinata */
  remotePinUnpin: (cid: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('remotePin:unpin', cid),

  /** Получить список пинов на Pinata */
  remotePinList: (limit?: number, offset?: number): Promise<{ success: boolean; data?: RemotePin[]; error?: string }> =>
    ipcRenderer.invoke('remotePin:list', limit, offset),

  /** Получить информацию о пине */
  remotePinGet: (cid: string): Promise<{ success: boolean; data?: RemotePin | null; error?: string }> =>
    ipcRenderer.invoke('remotePin:get', cid),

  /** Проверить, закреплён ли CID на Pinata */
  remotePinIsPinned: (cid: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('remotePin:isPinned', cid),

  /** Получить статистику Pinata */
  remotePinStats: (): Promise<{ success: boolean; data?: PinataStats; error?: string }> =>
    ipcRenderer.invoke('remotePin:stats'),

  /** Обновить метаданные пина */
  remotePinUpdateMetadata: (
    cid: string,
    name: string,
    keyvalues?: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('remotePin:updateMetadata', cid, name, keyvalues),

  /** Получить статус pin job */
  remotePinGetJobStatus: (jobId: string): Promise<{ success: boolean; data?: PinataPinJob; error?: string }> =>
    ipcRenderer.invoke('remotePin:getJobStatus', jobId),

  /** Подписка на старт пининга */
  onRemotePinStarted: on<[PinataPinJob]>('remotePin:pinStarted'),

  /** Подписка на открепление */
  onRemotePinUnpinned: on<[{ cid: string }]>('remotePin:unpinned'),

  /** Подписка на обновление конфигурации */
  onRemotePinConfigUpdated: on<[RemotePinConfig]>('remotePin:configUpdated'),
}
