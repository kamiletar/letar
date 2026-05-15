/**
 * Типы для P2P Sharing хуков
 */

import type {
  IpfsServiceStatus,
  PublishedLibrary,
  PublisherConfig,
  PublishProgress,
  SchedulerStatus,
  Subscription,
  SubscriptionRefreshResult,
} from '../../../../../../shared/types/ipfs'
import type { PinataStats, RemotePin, RemotePinConfig } from '../../../../../../shared/types/remote-pinning'

/** Состояние IPFS */
export interface IpfsState {
  status: IpfsServiceStatus | null
  isLoading: boolean
  error: string | null
}

/** Состояние публикации */
export interface PublisherState {
  config: PublisherConfig | null
  published: PublishedLibrary | null
  progress: PublishProgress | null
  isPublishing: boolean
  isLoading: boolean
  error: string | null
  /** Количество аниме для публикации */
  animeCount: number
  /** Количество эпизодов для публикации */
  episodeCount: number
}

/** Состояние подписок */
export interface SubscriptionsState {
  list: Subscription[]
  isLoading: boolean
  isRefreshing: boolean
  refreshResults: SubscriptionRefreshResult[]
  error: string | null
}

/** Состояние планировщика */
export interface SchedulerState {
  status: SchedulerStatus | null
  isLoading: boolean
  error: string | null
}

/** Состояние Remote Pinning */
export interface RemotePinState {
  config: RemotePinConfig | null
  pins: RemotePin[]
  stats: PinataStats | null
  isLoading: boolean
  isTestingAuth: boolean
  error: string | null
}
