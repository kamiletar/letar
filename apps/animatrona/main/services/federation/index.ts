/**
 * Federation Service — Федерация трекеров
 *
 * Обеспечивает синхронизацию контента между независимыми Animatrona инстансами
 * через ActivityPub-based протокол.
 *
 * @module federation
 * @version 0.24.0
 */

// Главный сервис
export { FederationService, getFederationService } from './federation-service'

// ActivityPub
export { handleActivity } from './activitypub/activities'
export { createLocalActor, parseRemoteActor } from './activitypub/actor'
export { ActivityPubClient } from './activitypub/client'
export { signRequest, verifySignature } from './activitypub/signatures'
export * from './activitypub/types'

// Discovery
export { TrackerRegistry } from './discovery/tracker-registry'
export { discoverTracker, resolveWebFinger } from './discovery/webfinger'

// Sync
export { ContentSyncService } from './sync/content-sync'
export { SeederAggregator } from './sync/seeder-aggregator'

// Trust
export { ReputationTracker } from './trust/reputation'
export { calculateTrustScore, getTrustLevel } from './trust/trust-scoring'
