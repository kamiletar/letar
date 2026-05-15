/**
 * WebFinger Client
 *
 * Реализация RFC 7033 для обнаружения ActivityPub акторов.
 * WebFinger позволяет найти Actor URL по URL трекера.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7033
 */

import type { ActivityPubActor, WebFingerResponse } from '../../../../shared/types/federation'
import { parseRemoteActor } from '../activitypub/actor'

/**
 * Таймаут для WebFinger запросов (мс)
 */
const WEBFINGER_TIMEOUT = 5000

/**
 * WebFinger rel для ActivityPub
 */
const ACTIVITYPUB_REL = 'self'
const ACTIVITYPUB_TYPE = 'application/activity+json'

/**
 * Результат обнаружения трекера
 */
export interface DiscoverTrackerResult {
  success: boolean
  actor?: ActivityPubActor
  webfingerUrl?: string
  actorUrl?: string
  error?: string
}

/**
 * Обнаружить трекер по URL
 *
 * 1. Пробуем WebFinger по /.well-known/webfinger
 * 2. Если не работает — пробуем прямой доступ к /federation/actor
 *
 * @param url - URL трекера (например, https://tracker.example.com)
 */
export async function discoverTracker(url: string): Promise<DiscoverTrackerResult> {
  try {
    const baseUrl = normalizeTrackerUrl(url)

    // Шаг 1: Пробуем WebFinger
    const webfingerResult = await resolveWebFinger(baseUrl)
    if (webfingerResult.success && webfingerResult.actorUrl) {
      // Получаем Actor
      const actor = await fetchActorByUrl(webfingerResult.actorUrl)
      if (actor) {
        return {
          success: true,
          actor,
          webfingerUrl: webfingerResult.webfingerUrl,
          actorUrl: webfingerResult.actorUrl,
        }
      }
    }

    // Шаг 2: Fallback — прямой доступ к /federation/actor
    const directActorUrl = `${baseUrl}/federation/actor`
    const actor = await fetchActorByUrl(directActorUrl)
    if (actor) {
      return {
        success: true,
        actor,
        actorUrl: directActorUrl,
      }
    }

    return {
      success: false,
      error: 'Не удалось обнаружить трекер. Проверьте URL и доступность.',
    }
  } catch (error) {
    return {
      success: false,
      error: `Ошибка обнаружения: ${(error as Error).message}`,
    }
  }
}

/**
 * Выполнить WebFinger запрос
 *
 * @param baseUrl - Базовый URL трекера
 */
export async function resolveWebFinger(baseUrl: string): Promise<{
  success: boolean
  webfingerUrl?: string
  actorUrl?: string
  error?: string
}> {
  try {
    // WebFinger resource — используем URL трекера как subject
    const resource = encodeURIComponent(baseUrl)
    const webfingerUrl = `${baseUrl}/.well-known/webfinger?resource=${resource}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), WEBFINGER_TIMEOUT)

    try {
      const response = await fetch(webfingerUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/jrd+json, application/json',
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        return {
          success: false,
          error: `WebFinger вернул ${response.status}`,
        }
      }

      const data = (await response.json()) as WebFingerResponse

      // Ищем ссылку на ActivityPub actor
      const actorLink = data.links?.find((link) => link.rel === ACTIVITYPUB_REL && link.type === ACTIVITYPUB_TYPE)

      if (!actorLink?.href) {
        // Ищем альтернативный формат (rel=self без типа)
        const altLink = data.links?.find((link) => link.rel === ACTIVITYPUB_REL && link.href?.includes('/federation/'))

        if (altLink?.href) {
          return {
            success: true,
            webfingerUrl,
            actorUrl: altLink.href,
          }
        }

        return {
          success: false,
          error: 'WebFinger не содержит ссылку на ActivityPub actor',
        }
      }

      return {
        success: true,
        webfingerUrl,
        actorUrl: actorLink.href,
      }
    } catch (error) {
      // AbortError — таймаут
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          error: 'Таймаут WebFinger запроса',
        }
      }
      // TypeError: terminated — соединение прервано
      if (error instanceof TypeError && error.message === 'terminated') {
        return {
          success: false,
          error: 'Соединение прервано',
        }
      }
      return {
        success: false,
        error: `Ошибка WebFinger: ${(error as Error).message}`,
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    return {
      success: false,
      error: `Ошибка обнаружения: ${(error as Error).message}`,
    }
  }
}

/**
 * Получить Actor по URL
 */
async function fetchActorByUrl(actorUrl: string): Promise<ActivityPubActor | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBFINGER_TIMEOUT)

  try {
    const response = await fetch(actorUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/activity+json, application/ld+json, application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      return null
    }

    const json = await response.json()
    return parseRemoteActor(json)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Нормализовать URL трекера
 */
function normalizeTrackerUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Убираем trailing slash и path
    return parsed.origin
  } catch {
    // Добавляем https:// если нет протокола
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return normalizeTrackerUrl(`https://${url}`)
    }
    throw new Error(`Невалидный URL: ${url}`)
  }
}

/**
 * Создать WebFinger response для этого трекера
 *
 * @param baseUrl - Базовый URL трекера
 */
export function createWebFingerResponse(baseUrl: string): WebFingerResponse {
  return {
    subject: baseUrl,
    aliases: [`${baseUrl}/federation/actor`],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `${baseUrl}/federation/actor`,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: baseUrl,
      },
    ],
  }
}
