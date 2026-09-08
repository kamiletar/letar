/**
 * URL до IPFS-контента через HTTP-шлюз Kubo.
 *
 * Порт шлюза встроенной ноды не фиксирован (см. `main/services/ipfs.ts` `getGatewayUrl()`) —
 * реальный базовый URL приходит из main-процесса через IPC и сохраняется здесь на время жизни
 * страницы. Тот же паттерн, что `apps/animatrona/renderer/src/lib/media-url.ts` (свой модуль
 * вместо фиксированного `IPFS_GATEWAY_PORT` из `@letar/video-player-core`).
 */

let _gatewayBaseUrl: string | null = null

/** Установить реальный базовый URL Kubo gateway — вызывается при открытии эпизода */
export function setGatewayBaseUrl(baseUrl: string | null): void {
  _gatewayBaseUrl = baseUrl
}

export function getGatewayBaseUrl(): string | null {
  return _gatewayBaseUrl
}

/** CID → воспроизводимый URL через шлюз; null, если шлюз ещё не известен или CID не передан */
export function toIpfsUrl(cid: string | null | undefined): string | null {
  if (!cid || !_gatewayBaseUrl) {
    return null
  }
  return `${_gatewayBaseUrl}/ipfs/${cid}`
}
