/**
 * Регистрация на relay-сервере, heartbeat и мониторинг relay reservation
 *
 * Relay-сервер ведёт ACL белый список PeerId.
 * Клиент регистрируется при запуске и периодически обновляет регистрацию (heartbeat).
 *
 * Мониторинг: проверяет наличие /p2p-circuit адреса в announced addresses.
 * Если reservation потеряна (ConnMgr prune, сеть, etc.) — восстанавливает
 * через swarm connect → autorelay автоматически переполучает reservation.
 *
 * Если swarm connect не помогает (autorelay backoff) — через RESTART_THRESHOLD
 * последовательных пропусков вызывается onRestartNeeded → рестарт Kubo
 * сбрасывает backoff, autorelay немедленно получает reservation после старта.
 */

import { app } from 'electron'
import http from 'http'

import { createModuleLogger } from '../../utils/logger'
import { PRIVATE_RELAY, RELAY_REGISTER_URL } from './kubo-config'

const log = createModuleLogger('KuboRelay')

/**
 * Количество последовательных пропусков relay reservation перед рестартом Kubo.
 * 10 пропусков × 30 сек = ~5 мин без резервации → рестарт.
 * Рестарт сбрасывает autorelay backoff — единственный надёжный способ.
 */
const RESTART_THRESHOLD = 10

/**
 * Минимальный интервал между рестартами Kubo из-за relay.
 * Защита от restart loop при проблемах с сетью.
 */
const RESTART_COOLDOWN_MS = 10 * 60 * 1000

/**
 * Задержка повторного heartbeat при ошибке регистрации.
 * TTL relay = 60 мин, heartbeat = 30 мин → при сбое повторяем через 5 мин.
 */
const HEARTBEAT_RETRY_MS = 5 * 60 * 1000

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
 * Создать интервал heartbeat регистрации на relay (каждые 30 мин).
 *
 * При ошибке heartbeat повторяет попытку через HEARTBEAT_RETRY_MS (5 мин),
 * чтобы не допустить истечения TTL (60 мин) при временных сбоях сети.
 *
 * @param getPeerId — функция для получения актуального PeerId
 * @returns Интервал (для очистки при shutdown через stopRelayHeartbeat)
 */
export function createRelayHeartbeat(getPeerId: () => string | null): ReturnType<typeof setInterval> {
  let retryTimeout: ReturnType<typeof setTimeout> | null = null

  const doHeartbeat = async () => {
    // Сбрасываем pending retry перед новой попыткой
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
    try {
      await registerWithRelay(getPeerId())
    } catch (err) {
      log.warn('Heartbeat регистрации на relay не удался, повтор через 5 мин', {
        error: String(err),
      })
      // Планируем повтор — но только если ещё нет pending retry
      if (!retryTimeout) {
        retryTimeout = setTimeout(() => {
          retryTimeout = null
          doHeartbeat().catch(() => {})
        }, HEARTBEAT_RETRY_MS)
      }
    }
  }

  const interval = setInterval(
    () => {
      doHeartbeat().catch(() => {})
    },
    30 * 60 * 1000
  ) as ReturnType<typeof setInterval> & { __stopHeartbeat?: () => void }

  // Прикрепляем cleanup функцию для clearTimeout retryTimeout при shutdown
  interval.__stopHeartbeat = () => {
    clearInterval(interval)
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
  }

  return interval
}

/**
 * Остановить relay heartbeat (очищает интервал и pending retry timeout)
 */
export function stopRelayHeartbeat(interval: ReturnType<typeof setInterval> | null): void {
  if (!interval) {
    return
  }
  const combined = interval as ReturnType<typeof setInterval> & { __stopHeartbeat?: () => void }
  if (combined.__stopHeartbeat) {
    combined.__stopHeartbeat()
  } else {
    clearInterval(interval)
  }
}

/**
 * Опции для createRelayMonitor
 */
export interface RelayMonitorOptions {
  /**
   * Вызывается когда reservation потеряна на длительное время (RESTART_THRESHOLD пропусков).
   * Должен перезапустить Kubo — единственный способ сбросить autorelay backoff.
   * Вызывается не чаще чем раз в RESTART_COOLDOWN_MS.
   */
  onRestartNeeded?: () => Promise<void>
}

/**
 * Мониторинг relay reservation
 *
 * AcceleratedDHTClient создаёт 700-1500 соединений в первые 30с.
 * ConnMgr может прунить relay-connection от AutoRelay (не защищено
 * Peering тегом "keep"), убивая reservation.
 *
 * Решение:
 * 1. Периодически проверять наличие /p2p-circuit адреса.
 * 2. Если потерян → swarm connect к relay → autorelay перерезервирует.
 * 3. Если swarm connect не помогает N раз (autorelay backoff) → рестарт Kubo.
 *    Рестарт сбрасывает in-memory backoff, autorelay сразу получает reservation.
 *
 * @param getApiUrl — функция для получения Kubo API URL
 * @param options — опциональные настройки (onRestartNeeded callback)
 * @returns Интервал (для очистки при shutdown)
 */
export function createRelayMonitor(
  getApiUrl: () => string | null,
  options?: RelayMonitorOptions
): ReturnType<typeof setInterval> {
  const { onRestartNeeded } = options ?? {}

  let consecutiveMisses = 0
  let hasLoggedRecovery = false
  let lastRestartAt = 0
  let isRestarting = false

  const checkAndRecover = async () => {
    const apiUrl = getApiUrl()
    if (!apiUrl) {
      return
    }

    // Не проверяем во время рестарта — Kubo недоступен
    if (isRestarting) {
      return
    }

    try {
      const hasRelay = await hasRelayReservation(apiUrl)

      if (hasRelay) {
        if (consecutiveMisses > 0 && !hasLoggedRecovery) {
          log.info('Relay reservation восстановлена', { afterMisses: consecutiveMisses })
          hasLoggedRecovery = true
        }
        consecutiveMisses = 0
        hasLoggedRecovery = false
        return
      }

      // Reservation потеряна
      consecutiveMisses++

      // Первый miss — может быть нормальной инициализацией
      if (consecutiveMisses === 1) {
        log.debug('Relay reservation не обнаружена, проверим снова')
        return
      }

      // 2+ misses — пробуем восстановить через swarm connect
      log.warn('Relay reservation потеряна, восстанавливаю...', { consecutiveMisses })
      await forceSwarmConnect(apiUrl, PRIVATE_RELAY)

      // Проверяем порог рестарта — swarm connect не сбрасывает autorelay backoff
      if (consecutiveMisses >= RESTART_THRESHOLD && onRestartNeeded && !isRestarting) {
        const now = Date.now()
        const timeSinceLastRestart = now - lastRestartAt

        if (timeSinceLastRestart >= RESTART_COOLDOWN_MS) {
          log.warn('Relay reservation не восстанавливается — рестарт Kubo для сброса autorelay backoff', {
            consecutiveMisses,
            minutesSinceLastRestart: Math.round(timeSinceLastRestart / 60000),
          })
          isRestarting = true
          lastRestartAt = now
          consecutiveMisses = 0
          hasLoggedRecovery = false

          try {
            await onRestartNeeded()
          } catch (err) {
            log.error('Ошибка рестарта Kubo из-за relay', { error: String(err) })
          } finally {
            isRestarting = false
          }
        } else {
          log.warn('Рестарт Kubo нужен, но кулдаун не истёк', {
            consecutiveMisses,
            cooldownRemainingMin: Math.round((RESTART_COOLDOWN_MS - timeSinceLastRestart) / 60000),
          })
        }
      }
    } catch (err) {
      log.debug('Ошибка проверки relay reservation', { error: String(err) })
    }
  }

  // Первая проверка через 45 секунд (после ConnMgr GracePeriod + запас)
  const initialDelay = setTimeout(() => {
    checkAndRecover().catch(() => {})
  }, 45_000)

  // Затем каждые 30 секунд
  const interval = setInterval(() => {
    checkAndRecover().catch(() => {})
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
  if (!interval) {
    return
  }
  clearInterval(interval)
  const combined = interval as ReturnType<typeof setInterval> & { __initialDelay?: ReturnType<typeof setTimeout> }
  if (combined.__initialDelay) {
    clearTimeout(combined.__initialDelay)
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
  if (!res.ok) {
    return false
  }

  const data = (await res.json()) as { Addresses?: string[] }
  const addrs = data.Addresses ?? []
  return addrs.some((addr) => addr.includes('/p2p-circuit'))
}

/**
 * Принудительно подключиться к relay через swarm connect
 *
 * Создаёт новое TCP-соединение к relay, которое autorelay может
 * переиспользовать для reservation. Помогает при потере соединения,
 * но НЕ помогает при autorelay exponential backoff — для этого нужен
 * рестарт Kubo через onRestartNeeded.
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
