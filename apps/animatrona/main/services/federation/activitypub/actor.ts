/**
 * ActivityPub Actor Management
 *
 * Управление локальным и удалёнными акторами.
 * Actor представляет Animatrona трекер в федеративной сети.
 */

import type { PrismaClient } from '@prisma/client'

import type { ActivityPubActor, ActivityPubPublicKey, TrackerMetadata } from '../../../../shared/types/federation'
import { ACTIVITYPUB_CONTEXT, SECURITY_CONTEXT } from '../../../../shared/types/federation'

/**
 * Опции для создания локального актора
 */
export interface CreateActorOptions {
  /** Базовый URL трекера */
  baseUrl: string
  /** Prisma клиент для получения настроек и статистики */
  prisma: PrismaClient
}

/**
 * Создать локальный ActivityPub Actor
 *
 * Генерирует Actor JSON для этого трекера на основе настроек.
 */
export async function createLocalActor(options: CreateActorOptions): Promise<ActivityPubActor> {
  const { baseUrl, prisma } = options

  // Получаем настройки федерации
  const settings = await prisma.federationSettings.findUnique({
    where: { id: 'default' },
  })

  // Получаем статистику библиотеки
  const [animeCount, episodeCount] = await Promise.all([prisma.anime.count(), prisma.episode.count()])

  const actorId = `${baseUrl}/federation/actor`

  const publicKey: ActivityPubPublicKey = {
    id: `${actorId}#main-key`,
    owner: actorId,
    publicKeyPem: settings?.publicKeyPem ?? '',
  }

  const metadata: TrackerMetadata = {
    theme: settings?.theme ?? 'anime',
    language: settings?.language ?? 'ru',
    version: '0.24.0',
    stats: {
      animeCount,
      episodeCount,
      totalSize: 0,
    },
  }

  return {
    '@context': [ACTIVITYPUB_CONTEXT, SECURITY_CONTEXT],
    id: actorId,
    type: 'Service',
    name: settings?.trackerName ?? 'My Animatrona',
    summary: settings?.trackerDescription,
    inbox: `${baseUrl}/federation/inbox`,
    outbox: `${baseUrl}/federation/outbox`,
    publicKey,
    endpoints: {
      content: `${baseUrl}/federation/content`,
      announces: `${baseUrl}/federation/announces`,
    },
    'animatrona:metadata': metadata,
  }
}

/**
 * Парсить удалённый Actor JSON
 *
 * Валидирует и извлекает данные из ActivityPub Actor.
 */
export function parseRemoteActor(json: unknown): ActivityPubActor | null {
  if (!json || typeof json !== 'object') {
    return null
  }

  const obj = json as Record<string, unknown>

  // Проверяем обязательные поля
  if (
    typeof obj.id !== 'string' ||
    obj.type !== 'Service' ||
    typeof obj.inbox !== 'string' ||
    typeof obj.outbox !== 'string'
  ) {
    return null
  }

  // Извлекаем публичный ключ
  let publicKey: ActivityPubPublicKey | null = null
  if (obj.publicKey && typeof obj.publicKey === 'object') {
    const pk = obj.publicKey as Record<string, unknown>
    if (typeof pk.id === 'string' && typeof pk.owner === 'string' && typeof pk.publicKeyPem === 'string') {
      publicKey = {
        id: pk.id,
        owner: pk.owner,
        publicKeyPem: pk.publicKeyPem,
      }
    }
  }

  // Извлекаем endpoints
  let endpoints = { content: '', announces: '' }
  if (obj.endpoints && typeof obj.endpoints === 'object') {
    const ep = obj.endpoints as Record<string, unknown>
    endpoints = {
      content: typeof ep.content === 'string' ? ep.content : '',
      announces: typeof ep.announces === 'string' ? ep.announces : '',
    }
  }

  // Извлекаем метаданные Animatrona
  let metadata: TrackerMetadata = {
    theme: 'anime',
    language: 'ru',
    version: 'unknown',
    stats: { animeCount: 0, episodeCount: 0, totalSize: 0 },
  }
  const metaKey = 'animatrona:metadata'
  if (obj[metaKey] && typeof obj[metaKey] === 'object') {
    const meta = obj[metaKey] as Record<string, unknown>
    metadata = {
      theme: typeof meta.theme === 'string' ? meta.theme : 'anime',
      language: typeof meta.language === 'string' ? meta.language : 'ru',
      version: typeof meta.version === 'string' ? meta.version : 'unknown',
      stats: {
        animeCount:
          typeof (meta.stats as Record<string, unknown>)?.animeCount === 'number'
            ? (meta.stats as Record<string, number>).animeCount
            : 0,
        episodeCount:
          typeof (meta.stats as Record<string, unknown>)?.episodeCount === 'number'
            ? (meta.stats as Record<string, number>).episodeCount
            : 0,
        totalSize:
          typeof (meta.stats as Record<string, unknown>)?.totalSize === 'number'
            ? (meta.stats as Record<string, number>).totalSize
            : 0,
      },
    }
  }

  // Извлекаем icon
  let icon: { type: 'Image'; url: string } | undefined
  if (obj.icon && typeof obj.icon === 'object') {
    const ic = obj.icon as Record<string, unknown>
    if (ic.type === 'Image' && typeof ic.url === 'string') {
      icon = { type: 'Image', url: ic.url }
    }
  }

  return {
    '@context': Array.isArray(obj['@context']) ? (obj['@context'] as string[]) : [ACTIVITYPUB_CONTEXT],
    id: obj.id,
    type: 'Service',
    name: typeof obj.name === 'string' ? obj.name : 'Unknown',
    summary: typeof obj.summary === 'string' ? obj.summary : undefined,
    icon,
    inbox: obj.inbox,
    outbox: obj.outbox,
    publicKey: publicKey ?? {
      id: `${obj.id}#main-key`,
      owner: obj.id,
      publicKeyPem: '',
    },
    endpoints,
    'animatrona:metadata': metadata,
  }
}

/**
 * Извлечь базовый URL из Actor ID
 */
export function getBaseUrlFromActor(actor: ActivityPubActor): string {
  try {
    const url = new URL(actor.id)
    return url.origin
  } catch {
    return ''
  }
}

/**
 * Проверить, является ли Actor валидным Animatrona трекером
 */
export function isAnimatronaTracker(actor: ActivityPubActor): boolean {
  // Проверяем наличие Animatrona-специфичных полей
  return (
    actor.type === 'Service' &&
    !!actor.endpoints?.content &&
    !!actor.endpoints?.announces &&
    !!actor['animatrona:metadata']
  )
}
