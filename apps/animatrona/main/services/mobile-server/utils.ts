/**
 * Утилиты для Mobile Server
 */

import { networkInterfaces } from 'os'
import QRCode from 'qrcode'

import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('MobileServer')

/**
 * Получить локальный IP адрес машины
 * Предпочитает локальную сеть (192.168.x.x, 172.16-31.x.x) перед VPN (10.8.x.x)
 */
export function getLocalIP(): string | null {
  const interfaces = networkInterfaces()

  // Имена интерфейсов, которые обычно являются VPN
  const vpnInterfacePatterns = ['tun', 'tap', 'wg', 'vpn', 'ppp', 'utun']

  // Собираем все IPv4 адреса с приоритетами
  const candidates: Array<{ ip: string; priority: number; name: string }> = []

  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name]
    if (!netInterface) {
      continue
    }

    // Пропускаем VPN интерфейсы по имени
    const lowerName = name.toLowerCase()
    const isVpnInterface = vpnInterfacePatterns.some((p) => lowerName.includes(p))

    for (const info of netInterface) {
      // Пропускаем IPv6 и internal (localhost)
      if (info.family !== 'IPv4' || info.internal) {
        continue
      }

      const ip = info.address
      let priority = 0

      // Определяем приоритет по типу адреса
      if (ip.startsWith('192.168.')) {
        // Домашняя/офисная сеть — высший приоритет
        priority = 100
      } else if (ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        // Частная сеть 172.16-31.x.x
        priority = 90
      } else if (ip.startsWith('10.')) {
        // 10.x.x.x — может быть VPN или локальная сеть
        if (ip.startsWith('10.8.') || ip.startsWith('10.0.')) {
          // Типичные VPN диапазоны — низкий приоритет
          priority = 10
        } else {
          // Другие 10.x.x.x — средний приоритет
          priority = 50
        }
      } else {
        // Другие адреса
        priority = 30
      }

      // Снижаем приоритет для VPN интерфейсов
      if (isVpnInterface) {
        priority -= 50
      }

      candidates.push({ ip, priority, name })
      log.debug('Found IP candidate', { interface: name, ip, priority, isVpn: isVpnInterface })
    }
  }

  if (candidates.length === 0) {
    log.warn('No local IP found')
    return null
  }

  // Сортируем по приоритету (выше = лучше)
  candidates.sort((a, b) => b.priority - a.priority)

  const best = candidates[0]
  log.info('Selected local IP', { interface: best.name, ip: best.ip, priority: best.priority })
  return best.ip
}

/**
 * Получить все доступные локальные IP адреса
 * Возвращает список с приоритетами для отображения пользователю
 */
export function getAllLocalIPs(): Array<{ ip: string; type: 'lan' | 'vpn' | 'other'; interface: string }> {
  const interfaces = networkInterfaces()
  const vpnPatterns = ['tun', 'tap', 'wg', 'vpn', 'ppp', 'utun']
  const result: Array<{ ip: string; type: 'lan' | 'vpn' | 'other'; interface: string }> = []

  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name]
    if (!netInterface) {
      continue
    }

    const lowerName = name.toLowerCase()
    const isVpn = vpnPatterns.some((p) => lowerName.includes(p))

    for (const info of netInterface) {
      if (info.family !== 'IPv4' || info.internal) {
        continue
      }

      const ip = info.address
      let type: 'lan' | 'vpn' | 'other' = 'other'

      if (ip.startsWith('192.168.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        type = 'lan'
      } else if (ip.startsWith('10.8.') || ip.startsWith('10.0.') || isVpn) {
        type = 'vpn'
      } else if (ip.startsWith('10.')) {
        type = 'lan' // 10.x.x.x может быть и LAN
      }

      result.push({ ip, type, interface: name })
    }
  }

  // Сортируем: LAN первый, потом VPN, потом остальные
  return result.sort((a, b) => {
    const priority = { lan: 0, vpn: 1, other: 2 }
    return priority[a.type] - priority[b.type]
  })
}

/**
 * Сгенерировать QR-код для URL
 * @returns Data URL изображения QR-кода (base64 PNG)
 */
export async function generateQRCode(url: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return dataUrl
  } catch (error) {
    log.error('Failed to generate QR code', { error: String(error) })
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Парсит Range header
 */
export function parseRange(range: string, fileSize: number): { start: number; end: number } | null {
  const match = range.match(/bytes=(\d*)-(\d*)/)
  if (!match) {
    return null
  }

  const start = match[1] ? parseInt(match[1], 10) : 0
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

  // Валидация
  if (start >= fileSize || end >= fileSize || start > end) {
    return null
  }

  return { start, end }
}
