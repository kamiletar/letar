/**
 * Хук для управления P2P Sharing (IPFS)
 *
 * Композитный хук, объединяющий:
 * - useIpfs — управление IPFS нодой
 * - usePublisher — публикация библиотеки
 * - useSubscriptions — подписки на другие библиотеки
 * - useScheduler — планировщик автообновления
 * - useRemotePin — Pinata remote pinning
 */

import { useCallback } from 'react'

import type {
  PublisherConfig,
  PublishResult,
  SchedulerConfig,
  Subscription,
  SubscriptionCreateData,
  SubscriptionRefreshResult,
} from '../../../../../shared/types/ipfs'
import type { PinataConfig, RemotePinOptions } from '../../../../../shared/types/remote-pinning'

import {
  type IpfsState,
  type PublisherState,
  type RemotePinState,
  type SchedulerState,
  type SubscriptionsState,
  useIpfs,
  usePublisher,
  useRemotePin,
  useScheduler,
  useSubscriptions,
} from './p2p-sharing'

export interface UseP2PSharingReturn {
  // IPFS
  ipfs: IpfsState
  startIpfs: () => Promise<void>
  stopIpfs: () => Promise<void>

  // Publisher
  publisher: PublisherState
  updatePublisherConfig: (updates: Partial<PublisherConfig>) => Promise<void>
  publishLibrary: () => Promise<PublishResult | null>
  refreshPublisher: () => Promise<void>

  // Subscriptions
  subscriptions: SubscriptionsState
  addSubscription: (data: SubscriptionCreateData) => Promise<Subscription | null>
  removeSubscription: (id: string) => Promise<boolean>
  updateSubscription: (
    id: string,
    data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit'>>,
  ) => Promise<Subscription | null>
  refreshSubscription: (id: string) => Promise<SubscriptionRefreshResult | null>
  refreshAllSubscriptions: () => Promise<void>

  // Scheduler
  scheduler: SchedulerState
  updateSchedulerConfig: (updates: Partial<SchedulerConfig>) => Promise<void>
  startScheduler: () => Promise<void>
  stopScheduler: () => Promise<void>
  checkNow: () => Promise<void>

  // Remote Pinning (Pinata)
  remotePin: RemotePinState
  updatePinataConfig: (updates: Partial<PinataConfig>) => Promise<void>
  testPinataAuth: (jwt: string) => Promise<boolean>
  pinRemotely: (cid: string, options?: RemotePinOptions) => Promise<boolean>
  unpinRemotely: (cid: string) => Promise<boolean>
  refreshRemotePins: () => Promise<void>
  refreshRemoteStats: () => Promise<void>
}

/**
 * Композитный хук для управления P2P Sharing
 */
export function useP2PSharing(): UseP2PSharingReturn {
  // Подключаем отдельные хуки
  const { ipfs, startIpfs, stopIpfs } = useIpfs()
  const { publisher, updatePublisherConfig, publishLibrary, refreshPublisher } = usePublisher()
  const {
    subscriptions,
    addSubscription,
    removeSubscription,
    updateSubscription,
    refreshSubscription,
    refreshAllSubscriptions,
    setIsRefreshing,
    setRefreshResults,
  } = useSubscriptions()

  // Scheduler с колбэком для обновления subscriptions
  const {
    scheduler,
    updateSchedulerConfig,
    startScheduler,
    stopScheduler,
    checkNow: checkNowBase,
  } = useScheduler((results) => {
    setRefreshResults(results)
  })

  const {
    remotePin,
    updatePinataConfig,
    testPinataAuth,
    pinRemotely,
    unpinRemotely,
    refreshRemotePins,
    refreshRemoteStats,
  } = useRemotePin()

  // Обёртка checkNow для связи с subscriptions
  const checkNow = useCallback(async () => {
    await checkNowBase(setIsRefreshing, setRefreshResults)
  }, [checkNowBase, setIsRefreshing, setRefreshResults])

  return {
    // IPFS
    ipfs,
    startIpfs,
    stopIpfs,

    // Publisher
    publisher,
    updatePublisherConfig,
    publishLibrary,
    refreshPublisher,

    // Subscriptions
    subscriptions,
    addSubscription,
    removeSubscription,
    updateSubscription,
    refreshSubscription,
    refreshAllSubscriptions,

    // Scheduler
    scheduler,
    updateSchedulerConfig,
    startScheduler,
    stopScheduler,
    checkNow,

    // Remote Pinning
    remotePin,
    updatePinataConfig,
    testPinataAuth,
    pinRemotely,
    unpinRemotely,
    refreshRemotePins,
    refreshRemoteStats,
  }
}
