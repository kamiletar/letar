/**
 * Регистрация на relay-сервере, heartbeat и мониторинг relay reservation
 *
 * Relay-сервер ведёт ACL белый список PeerId.
 * Клиент регистрируется при запуске и периодически обновляет регистрацию (heartbeat).
 *
 * Мониторинг: проверяет наличие /p2p-circuit адреса в announced addresses.
 * Если reservation потеряна (ConnMgr prune, сеть, etc.) — восстанавливает
 * через swarm connect → autorelay автоматически переполучает reservation.
 */

import { app } from 'electron'
import http from 'http'

import { createModuleLogger } from '../../utils/logger'
import { PRIVATE_RELAY, RELAY_REGISTER_URL } from './kubo-config'

const log = createModuleLogger('KuboRelay')

/**
 * Зарегистрировать peer ID на relay-сервере
 *
 * POST /register { peer_id, app_version } → добавляет в ACL белый список
 */
export async function registerWithRelay(peerId: string | null): Promise<void> {
  if (!peerId) {
    return
  }

  const appVersion = app.getVersion()
  const body = JSON.stringify({ peer_id: peerId, app_version: appVersion })

  return new Promise<void>((resolve, reject) => {
    const url = new URL(RELAY_REGISTER_URL)
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString()
        })
        res.on('end', () => {
          if (res.statusCode === 200) {
            log.info('Зарегистрирован на relay', { peerId: peerId.slice(-8) })
            resolve()
          } else {
            reject(new Error(`Relay вернул ${res.statusCode}: ${data}`))
          }
        })
      }
    )
    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Таймаут регистрации на relay'))
    })
    req.write(body)
    req.end()
  })
}

/**
 * Создать интервал heartbeat регистрации на relay (каждые 30 мин)
 *
 * @param getPeerId — функция для получения актуального PeerId
 * @returns Интервал (для очистки при shutdown)
 */
export function createRelayHeartbeat(getPeerId: () => string | null): ReturnType<typeof setInterval> {
  // Heartbeat каждые 30 минут (TTL на relay = 60 мин)
  return setInterval(
    async () => {
      try {
        await registerWithRelay(getPeerId())
      } catch (err) {
        log.warn('Heartbeat регистрации на relay не удался', { error: String(err) })
      }
    },
    30 * 60 * 1000
  )
}

/**
 * Мониторинг relay reservation
 *
 * AcceleratedDHTClient создаёт 700-1500 соединений в первые 30с.
 * ConnMgr может прунить relay-connection от AutoRelay (не защищено
 * Peering тегом "keep"), убивая reservation.
 *
 * Решение: периодически проверять наличие /p2p-circuit адреса.
 * Если потерян → swarm connect к relay → autorelay перерезервирует.
 *
 * @param getApiUrl — функция для получения Kubo API URL
 * @returns Интервал (для очистки при shutdown)
 */
export function createRelayMonitor(getApiUrl: () => string | null): ReturnType<typeof setInterval> {
  let consecutiveMisses = 0
  let hasLoggedRecovery = false

  // Первая проверка через 45 секунд (после ConnMgr GracePeriod + запас)
  const initialDelay = setTimeout(() => {
    checkAndRecover(getApiUrl, consecutiveMisses, hasLoggedRecovery).then((result) => {
      consecutiveMisses = result.misses
      hasLoggedRecovery = result.loggedRecovery
    })
  }, 45_000)

  // Затем каждые 30 секунд
  const interval = setInterval(async () => {
    const result = await checkAndRecover(getApiUrl, consecutiveMisses, hasLoggedRecovery)
    consecutiveMisses = result.misses
    hasLoggedRecovery = result.loggedRecovery
  }, 30_000)

  // Обернём для cleanup обоих таймеров
  const combined = interval as ReturnType<typeof setInterval> & { __initialDelay?: ReturnType<typeof setTimeout> }
  combined.__initialDelay = initialDelay

  return combined
}

/**
 * Остановить relay monitor (очистить оба таймера)
 */
export function stopRelayMonitor(interval: ReturnType<typeof setInterval> | null): void {
  if (!interval) return
  clearInterval(interval)
  const combined = interval as ReturnType<typeof setInterval> & { __initialDelay?: ReturnType<typeof setTimeout> }
  if (combined.__initialDelay) {
    clearTimeout(combined.__initialDelay)
  }
}

/**
 * Проверить relay reservation и восстановить если потеряна
 */
async function checkAndRecover(
  getApiUrl: () => string | null,
  consecutiveMisses: number,
  hasLoggedRecovery: boolean
): Promise<{ misses: number; loggedRecovery: boolean }> {
  const apiUrl = getApiUrl()
  if (!apiUrl) {
    return { misses: consecutiveMisses, loggedRecovery: hasLoggedRecovery }
  }

  try {
    const hasRelay = await hasRelayReservation(apiUrl)

    if (hasRelay) {
      if (consecutiveMisses > 0 && !hasLoggedRecovery) {
        log.info('Relay reservation восстановлена', { afterMisses: consecutiveMisses })
        return { misses: 0, loggedRecovery: true }
      }
      return { misses: 0, loggedRecovery: false }
    }

    // Reservation потеряна
    consecutiveMisses++

    // Первый miss — может быть нормальной инициализацией
    if (consecutiveMisses === 1) {
      log.debug('Relay reservation не обнаружена, проверим снова')
      return { misses: consecutiveMisses, loggedRecovery: false }
    }

    // 2+ misses — пробуем восстановить через swarm connect
    log.warn('Relay reservation потеряна, восстанавливаю...', {
      consecutiveMisses,
    })

    await forceSwarmConnect(apiUrl, PRIVATE_RELAY)
    return { misses: consecutiveMisses, loggedRecovery: false }
  } catch (err) {
    log.debug('Ошибка проверки relay reservation', { error: String(err) })
    return { misses: consecutiveMisses, loggedRecovery: hasLoggedRecovery }
  }
}

/**
 * Проверить, есть ли /p2p-circuit адрес в announced addresses Kubo
 */
async function hasRelayReservation(apiUrl: string): Promise<boolean> {
  const res = await fetch(`${apiUrl}/api/v0/id`, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return false

  const data = (await res.json()) as { Addresses?: string[] }
  const addrs = data.Addresses ?? []
  return addrs.some((addr) => addr.includes('/p2p-circuit'))
}

/**
 * Принудительно подключиться к relay через swarm connect
 *
 * Это создаёт новое TCP-соединение к relay, которое autorelay
 * может переиспользовать для reservation. Также сбрасывает
 * кэш "recentlyFailedRelays" в autorelay.
 */
async function forceSwarmConnect(apiUrl: string, relayMultiaddr: string): Promise<void> {
  try {
    const res = await fetch(`${apiUrl}/api/v0/swarm/connect?arg=${encodeURIComponent(relayMultiaddr)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      log.info('Swarm connect к relay успешен — ожидаем re-reservation')
    } else {
      const text = await res.text()
      log.warn('Swarm connect к relay не удался', { status: res.status, body: text.slice(0, 200) })
    }
  } catch (err) {
    log.warn('Swarm connect к relay: ошибка', { error: String(err) })
  }
}
