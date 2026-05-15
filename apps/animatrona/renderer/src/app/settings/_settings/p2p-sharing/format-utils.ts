/**
 * Утилиты форматирования для P2P Sharing
 *
 * Generic функции (formatBytes, formatTransferSpeed) — в @/lib/format-utils.
 * Здесь остаются только P2P-специфичные функции.
 */

import type { NatStatus } from '../../../../../../shared/types/ipfs'

// Реэкспорт generic функций из единого файла
export { formatBytes, formatTransferSpeed as formatSpeed } from '@/lib/format-utils'

/**
 * Цвет для количества пиров
 */
export function getPeerColor(peers: number): string {
  if (peers === 0) {
    return 'red'
  }
  if (peers < 5) {
    return 'yellow'
  }
  return 'green'
}

/**
 * Форматирование даты
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) {
    return '—'
  }
  const date = new Date(isoString)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Метка NAT статуса
 */
export function getNatStatusLabel(status: NatStatus): string {
  switch (status) {
    case 'public':
      return 'Открытый'
    case 'private':
      return 'За NAT'
    default:
      return 'Неизвестно'
  }
}

/**
 * Цвет NAT статуса
 */
export function getNatStatusColor(status: NatStatus): string {
  switch (status) {
    case 'public':
      return 'green'
    case 'private':
      return 'yellow'
    default:
      return 'gray'
  }
}
