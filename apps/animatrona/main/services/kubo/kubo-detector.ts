/**
 * Детектор IPFS Desktop (Kubo)
 *
 * Проверяет, запущен ли IPFS Desktop на стандартных портах.
 * Если да — Animatrona использует его вместо запуска собственного Kubo.
 */

import { createModuleLogger } from '../../utils/logger'
import { IPFS_DESKTOP_API_URL, IPFS_DESKTOP_PORTS } from './kubo-config'

const log = createModuleLogger('KuboDetector')

/**
 * Информация о найденном IPFS Desktop
 */
export interface IpfsDesktopInfo {
  /** ID пира IPFS Desktop */
  peerId: string
  /** Версия Kubo */
  version: string
  /** URL API */
  apiUrl: string
  /** Порт Gateway */
  gatewayPort: number
}

/**
 * Проверить доступность IPFS Desktop
 *
 * Делает запрос к /api/v0/id для проверки работоспособности
 * и получения информации о ноде.
 *
 * @returns Информация о IPFS Desktop или null если не найден
 */
export async function detectIpfsDesktop(): Promise<IpfsDesktopInfo | null> {
  try {
    log.info('Проверяю IPFS Desktop...')

    // Таймаут 3 секунды — IPFS Desktop должен отвечать быстро
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    try {
      // Запрос /api/v0/id возвращает информацию о ноде
      const response = await fetch(`${IPFS_DESKTOP_API_URL}/id`, {
        method: 'POST', // IPFS API использует POST
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        log.debug('IPFS Desktop вернул ошибку', { status: response.status })
        // Важно: закрываем body чтобы не утекало соединение
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        return null
      }

      const data = (await response.json()) as {
        ID?: string
        AgentVersion?: string
      }

      if (!data.ID) {
        log.debug('IPFS Desktop не вернул PeerId')
        return null
      }

      // Получаем версию
      const versionMatch = data.AgentVersion?.match(/kubo\/([0-9.]+)/)
      const version = versionMatch?.[1] ?? 'unknown'

      const info: IpfsDesktopInfo = {
        peerId: data.ID,
        version,
        apiUrl: `http://127.0.0.1:${IPFS_DESKTOP_PORTS.api}`,
        gatewayPort: IPFS_DESKTOP_PORTS.gateway,
      }

      log.info('IPFS Desktop найден', {
        peerId: info.peerId.slice(-8),
        version: info.version,
      })

      return info
    } catch (error) {
      clearTimeout(timeoutId)

      // AbortError — таймаут
      if (error instanceof Error && error.name === 'AbortError') {
        log.debug('IPFS Desktop не отвечает (таймаут)')
        return null
      }

      // ECONNREFUSED — не запущен
      const errCode = (error as NodeJS.ErrnoException).code
      if (errCode === 'ECONNREFUSED') {
        log.debug('IPFS Desktop не запущен (ECONNREFUSED)')
        return null
      }

      throw error
    }
  } catch (error) {
    log.debug('Ошибка детекции IPFS Desktop', { error: String(error) })
    return null
  }
}

/**
 * Проверить что IPFS Desktop всё ещё доступен
 *
 * Быстрая проверка через /api/v0/version (легче чем /id)
 */
export async function isIpfsDesktopAlive(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    try {
      const response = await fetch(`${IPFS_DESKTOP_API_URL}/version`, {
        method: 'POST',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      // Важно: закрываем body чтобы не утекало соединение
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      return response.ok
    } catch {
      clearTimeout(timeoutId)
      return false
    }
  } catch {
    return false
  }
}
