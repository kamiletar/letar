/**
 * ActivityPub типы для внутреннего использования
 *
 * Расширяет shared/types/federation.ts дополнительными типами
 * для работы с ActivityPub на уровне main process.
 */

// Реэкспорт основных типов
export {
  ACTIVITYPUB_CONTEXT,
  SECURITY_CONTEXT,
  type ActivityPubActivity,
  type ActivityPubActor,
  type ActivityPubPublicKey,
  type AnnounceActivity,
  type CreateActivity,
  type DeleteActivity,
  type ParsedSignature,
  type SignatureHeaders,
  type UpdateActivity,
  type VideoEpisodeObject,
  type VideoSeriesObject,
} from '../../../../shared/types/federation'

/**
 * Поддерживаемые типы activities
 */
export type ActivityType = 'Announce' | 'Create' | 'Update' | 'Delete' | 'Follow' | 'Undo'

/**
 * Результат обработки activity
 */
export interface ActivityHandleResult {
  success: boolean
  activityId: string
  type: ActivityType
  error?: string
}

/**
 * Опции для HTTP запроса с подписью
 */
export interface SignedRequestOptions {
  method: 'GET' | 'POST' | 'DELETE'
  url: string
  body?: string
  privateKeyPem: string
  keyId: string
}

/**
 * Опции верификации подписи
 */
export interface VerifyOptions {
  method: string
  path: string
  headers: Record<string, string>
  body?: string
  publicKeyPem: string
}

/**
 * Результат верификации подписи
 */
export interface VerifyResult {
  valid: boolean
  error?: string
  keyId?: string
}

/**
 * OrderedCollection для outbox/inbox
 */
export interface OrderedCollection<T = unknown> {
  '@context': string
  id: string
  type: 'OrderedCollection'
  totalItems: number
  first?: string
  last?: string
  orderedItems?: T[]
}

/**
 * OrderedCollectionPage для пагинации
 */
export interface OrderedCollectionPage<T = unknown> {
  '@context': string
  id: string
  type: 'OrderedCollectionPage'
  partOf: string
  next?: string
  prev?: string
  orderedItems: T[]
}

/**
 * Fetch Actor Result
 */
export interface FetchActorResult {
  success: boolean
  actor?: import('../../../../shared/types/federation').ActivityPubActor
  error?: string
}

/**
 * Content endpoint response
 */
export interface ContentResponse {
  '@context': string
  id: string
  type: 'OrderedCollection'
  totalItems: number
  orderedItems: import('../../../../shared/types/federation').VideoSeriesObject[]
}

/**
 * Announces endpoint response
 */
export interface AnnouncesResponse {
  '@context': string
  id: string
  type: 'OrderedCollection'
  totalItems: number
  orderedItems: import('../../../../shared/types/federation').AnnounceActivity[]
}
