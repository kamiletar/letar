import { getKuboService, type KuboServiceStatus } from '@letar/ipfs-kubo-core'
import { app } from 'electron'

let startPromise: Promise<void> | null = null

/**
 * Ленивый запуск Kubo-ноды — стартует один раз, повторные вызовы ждут ту же инициализацию.
 * KuboService сам определяет: подключиться к IPFS Desktop или поднять embedded-демон.
 */
export function ensureIpfsStarted(): Promise<void> {
  startPromise ??= getKuboService().initialize({
    libraryPath: app.getPath('userData'),
  })
  return startPromise
}

export function getIpfsStatus(): KuboServiceStatus {
  return getKuboService().getStatus()
}

/** URL HTTP-шлюза Kubo (`http://127.0.0.1:<port>`) — null, пока нода не запущена */
export function getGatewayUrl(): string | null {
  return getKuboService().getGatewayUrl()
}
