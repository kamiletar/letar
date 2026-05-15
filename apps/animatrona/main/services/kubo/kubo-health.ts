/**
 * Проверка здоровья Kubo и переподключение
 *
 * Функции для health check, проверки доступности API,
 * и восстановления соединения после потери связи.
 */

import http from 'http'
import type { KuboRPCClient } from 'kubo-rpc-client'

import { createModuleLogger } from '../../utils/logger'
import { isIpfsDesktopAlive } from './kubo-detector'
import type { KuboMode } from './kubo-types'

const log = createModuleLogger('KuboHealth')

/**
 * Параметры для health check
 */
export interface HealthCheckParams {
  client: KuboRPCClient | null
  mode: KuboMode
}

/**
 * Результат проверки здоровья
 */
export interface HealthCheckResult {
  /** Нода доступна */
  healthy: boolean
  /** Требуется переподключение */
  needsReconnect: boolean
}

/**
 * Проверка здоровья соединения
 *
 * Для external: проверяет что IPFS Desktop доступен
 * Для embedded: проверяет что RPC клиент отвечает на id()
 */
export async function checkHealth(params: HealthCheckParams): Promise<HealthCheckResult> {
  const { client, mode } = params

  if (!client) {
    return { healthy: false, needsReconnect: false }
  }

  try {
    if (mode === 'external') {
      // Проверяем что IPFS Desktop всё ещё доступен
      const alive = await isIpfsDesktopAlive()
      if (!alive) {
        log.warn('IPFS Desktop отключился — требуется переподключение')
        return { healthy: false, needsReconnect: true }
      }
    } else if (mode === 'embedded') {
      // Проверяем что embedded Kubo отвечает
      await client.id()
    }
    return { healthy: true, needsReconnect: false }
  } catch (error) {
    log.error('Health check failed — требуется переподключение', { error: String(error) })
    return { healthy: false, needsReconnect: true }
  }
}

/**
 * Проверить доступность Kubo API через http.request
 *
 * Делает POST запрос к /api/v0/id с ретраями.
 */
export function checkApiAvailable(port: number, retries = 10): Promise<boolean> {
  return new Promise((resolve) => {
    const attempt = (remaining: number) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/v0/id',
          method: 'POST',
          timeout: 2000,
        },
        (res) => {
          // Важно: потребляем body чтобы не утекало соединение
          res.resume()
          log.debug('Kubo API ответил', { statusCode: res.statusCode })
          resolve(res.statusCode === 200)
        }
      )

      req.on('error', (err) => {
        if (remaining > 0) {
          log.debug('Kubo API недоступен, повторная попытка...', { remaining, error: String(err) })
          setTimeout(() => attempt(remaining - 1), 500)
        } else {
          log.error('Kubo API недоступен после всех попыток', { error: String(err) })
          resolve(false)
        }
      })

      req.on('timeout', () => {
        req.destroy()
        if (remaining > 0) {
          log.debug('Kubo API таймаут, повторная попытка...', { remaining })
          setTimeout(() => attempt(remaining - 1), 500)
        } else {
          resolve(false)
        }
      })

      req.end()
    }

    attempt(retries)
  })
}
