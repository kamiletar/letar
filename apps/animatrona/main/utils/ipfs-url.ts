/**
 * Утилита для построения IPFS Gateway URL
 *
 * Централизует логику получения URL из CID,
 * чтобы не дублировать паттерн с fallback во всех сервисах.
 */

import { getKuboService } from '../services/kubo'

/** Fallback Gateway URL если Kubo не запущен */
const DEFAULT_GATEWAY = 'http://127.0.0.1:8081'

/**
 * Получить HTTP URL для IPFS контента по CID
 * Возвращает null если CID не указан
 */
export function getIpfsUrl(cid: string | null | undefined): string | null {
  if (!cid) {
    return null
  }
  const gateway = getKuboService().getGatewayUrl() ?? DEFAULT_GATEWAY
  return `${gateway}/ipfs/${cid}`
}
