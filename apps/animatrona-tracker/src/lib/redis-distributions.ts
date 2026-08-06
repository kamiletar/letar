/**
 * Redis-хранилище онлайн-статуса раздач.
 *
 * Heartbeat от Desktop клиентов пишет ключ с TTL 1ч.
 * Если ключ истёк — пир считается офлайн. Без cron.
 *
 * Ключи:
 *   dist:peer:{peerId}:{cid} → JSON {distId, userId, animeId, size}  TTL=3600
 */

import { getRedis } from './redis'

/** TTL для онлайн-статуса: 1 час (2 пропущенных heartbeat по 30 мин) */
const ONLINE_TTL_SEC = 3600

/** Префикс ключей раздач */
const PREFIX = 'dist:peer:'

/** Данные онлайн-пира */
export interface OnlinePeerData {
  distId: string
  userId: string
  animeId: string | null
  size: number
  peerId: string
  cid: string
}

/**
 * Отметить раздачу как онлайн (вызывается при heartbeat и регистрации).
 */
export async function setDistributionOnline(
  peerId: string,
  cid: string,
  data: { distId: string; userId: string; animeId: string | null; size: number | bigint },
): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }

  try {
    const key = `${PREFIX}${peerId}:${cid}`
    const value = JSON.stringify({
      distId: data.distId,
      userId: data.userId,
      animeId: data.animeId,
      size: Number(data.size),
    })
    await r.set(key, value, 'EX', ONLINE_TTL_SEC)
  } catch {
    // Redis недоступен — не критично
  }
}

/**
 * Удалить онлайн-статус (при явном shutdown/удалении раздачи).
 */
export async function removeDistributionOnline(peerId: string, cid: string): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }

  try {
    await r.del(`${PREFIX}${peerId}:${cid}`)
  } catch {
    // Не критично
  }
}

/**
 * Проверить онлайн ли конкретный пир.
 */
export async function isDistributionOnline(peerId: string, cid: string): Promise<boolean> {
  const r = getRedis()
  if (!r) {
    return false
  }

  try {
    return (await r.exists(`${PREFIX}${peerId}:${cid}`)) === 1
  } catch {
    return false
  }
}

/**
 * Получить все онлайн раздачи. Опционально фильтр по animeId.
 *
 * Использует SCAN для безопасного перебора ключей.
 */
export async function getOnlineDistributions(animeId?: string): Promise<OnlinePeerData[]> {
  const r = getRedis()
  if (!r) {
    return []
  }

  try {
    const result: OnlinePeerData[] = []
    let cursor = '0'

    do {
      const [nextCursor, keys] = await r.scan(cursor, 'MATCH', `${PREFIX}*`, 'COUNT', 200)
      cursor = nextCursor

      if (keys.length > 0) {
        const values = await r.mget(...keys)

        for (let i = 0; i < keys.length; i++) {
          const val = values[i]
          if (!val) {
            continue
          }

          const data = JSON.parse(val) as { distId: string; userId: string; animeId: string | null; size: number }

          // Фильтр по animeId если задан
          if (animeId && data.animeId !== animeId) {
            continue
          }

          // Извлекаем peerId и cid из ключа: dist:peer:{peerId}:{cid}
          const keyParts = keys[i].slice(PREFIX.length)
          const lastColon = keyParts.lastIndexOf(':')
          const peerId = keyParts.slice(0, lastColon)
          const cid = keyParts.slice(lastColon + 1)

          result.push({ ...data, peerId, cid })
        }
      }
    } while (cursor !== '0')

    return result
  } catch {
    return []
  }
}

/**
 * Счётчик онлайн сидов для конкретного аниме.
 */
export async function getOnlineSeedCount(animeId: string): Promise<number> {
  const distributions = await getOnlineDistributions(animeId)
  return distributions.length
}

/**
 * Общая статистика: количество уникальных онлайн пиров.
 */
export async function getGlobalOnlineCount(): Promise<number> {
  const r = getRedis()
  if (!r) {
    return 0
  }

  try {
    let count = 0
    let cursor = '0'

    do {
      const [nextCursor, keys] = await r.scan(cursor, 'MATCH', `${PREFIX}*`, 'COUNT', 200)
      cursor = nextCursor
      count += keys.length
    } while (cursor !== '0')

    return count
  } catch {
    return 0
  }
}
