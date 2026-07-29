/**
 * IP Whitelist Middleware
 * Backlog «Безопасность»: доп. слой поверх Bearer-токена (`auth.ts`) — ограничивает, с
 * каких адресов вообще принимаются запросы. Токен уже обязателен для всех роутов кроме
 * `/health`; whitelist — defence in depth на случай утечки токена.
 *
 * Список задаётся `ALLOWED_IPS` (через запятую): точные адреса или IPv4 CIDR
 * (`10.0.0.0/8,172.20.0.0/16,127.0.0.1`). Не задан — проверка выключена (не ломает
 * существующие развёртывания без явной настройки).
 */

import type { FastifyReply, FastifyRequest } from 'fastify'

interface IpRule {
  raw: string
  /** CIDR-диапазон (IPv4) — network/mask как 32-битные числа */
  cidr: { network: number; mask: number } | null
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return null
  }
  let result = 0
  for (const part of parts) {
    const n = Number(part)
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      return null
    }
    result = (result << 8) | n
  }
  return result >>> 0
}

function parseCidr(rule: string): IpRule['cidr'] {
  const [address, prefixStr] = rule.split('/')
  if (!prefixStr) {
    return null
  }
  const prefix = Number(prefixStr)
  const addressInt = ipv4ToInt(address)
  if (addressInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return { network: addressInt & mask, mask }
}

function parseRules(raw: string): IpRule[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => ({ raw: entry, cidr: entry.includes('/') ? parseCidr(entry) : null }))
}

function getAllowedRules(): IpRule[] | null {
  const raw = process.env.ALLOWED_IPS
  if (!raw || raw.trim() === '') {
    return null
  }
  return parseRules(raw)
}

/** Убирает IPv4-in-IPv6 префикс (`::ffff:10.0.0.5`), с которым сокеты Node иногда отдают адрес */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip
}

export function isIpAllowed(ip: string, rules: IpRule[]): boolean {
  const normalized = normalizeIp(ip)

  for (const rule of rules) {
    if (rule.cidr) {
      const ipInt = ipv4ToInt(normalized)
      if (ipInt !== null && (ipInt & rule.cidr.mask) === rule.cidr.network) {
        return true
      }
    } else if (rule.raw === normalized) {
      return true
    }
  }

  return false
}

/**
 * Fastify preHandler — регистрируется ДО authMiddleware, чтобы отклонённый по IP запрос
 * не тратил цикл на проверку токена. Health endpoint исключён по тем же соображениям,
 * что и в authMiddleware (нужен для Docker healthcheck без знания клиентского IP заранее).
 */
export async function ipWhitelistMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.url === '/health') {
    return
  }

  const rules = getAllowedRules()
  if (rules === null) {
    return
  }

  if (!isIpAllowed(request.ip, rules)) {
    reply.code(403).send({
      success: false,
      error: 'IP address not allowed',
      timestamp: new Date().toISOString(),
    })
  }
}
